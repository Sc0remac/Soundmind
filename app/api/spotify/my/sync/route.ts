// app/api/spotify/my/sync/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function getBearer() {
  const h = headers();
  const a = h.get("authorization") || h.get("Authorization") || "";
  const m = a.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "1";

    // 1) Identify the user with a user-scoped client
    const bearer = getBearer();
    if (!bearer) return NextResponse.json({ error: "Missing bearer" }, { status: 401 });

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } }
    );
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return NextResponse.json({ error: uErr?.message || "No user" }, { status: 401 });
    const userId = u.user.id;

    // 2) Read tokens with ADMIN client (bypass RLS)
    const { data: acct, error: acctErr } = await supabaseAdmin
      .from("spotify_accounts")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (acctErr || !acct) {
      return NextResponse.json({ error: acctErr?.message || "No Spotify account" }, { status: 400 });
    }

    let accessToken = acct.access_token as string;
    const refreshToken = acct.refresh_token as string;
    const exp = acct.expires_at ? new Date(acct.expires_at).getTime() : 0;

    // 3) Refresh if expiring
    if (!accessToken || exp - Date.now() < 60_000) {
      const base = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
      const redirect = process.env.SPOTIFY_REDIRECT_URI || `${base}/api/spotify/callback`;

      const resp = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          redirect_uri: redirect,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json({ error: "Refresh failed", text }, { status: 400 });
      }
      const t = await resp.json();
      accessToken = t.access_token;
      const newExp = new Date(Date.now() + Math.max(0, (t.expires_in ?? 3600) - 60) * 1000);

      await supabaseAdmin
        .from("spotify_accounts")
        .update({
          access_token: accessToken,
          refresh_token: t.refresh_token ?? refreshToken,
          expires_at: newExp.toISOString(),
        })
        .eq("user_id", userId);
    }

    // 4) Windowing
    let afterParam = "";
    if (!full) {
      const { data: last } = await supabaseAdmin
        .from("spotify_listens")
        .select("played_at")
        .eq("user_id", userId)
        .order("played_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (last?.played_at) afterParam = `&after=${new Date(last.played_at).getTime() + 1}`;
    }

    // 5) Fetch recently played
    const apiUrl = `https://api.spotify.com/v1/me/player/recently-played?limit=200${afterParam}`;
    const spRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!spRes.ok) {
      const text = await spRes.text();
      return NextResponse.json({ error: "Spotify API error", status: spRes.status, text }, { status: 400 });
    }
    const payload = await spRes.json();
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) return NextResponse.json({ ok: true, items_received: 0, imported: 0 });

    type TrackRow = {
      id: string;
      name: string | null;
      artist_name: string | null;
      album_image_url: string | null;
      preview_url: string | null;
    };

    type ArtistRow = { id: string; name: string };
    type TrackArtistRow = { track_id: string; artist_id: string };

    // 6) Build rows
    const trackMap = new Map<string, TrackRow>();
    const listenMap = new Map<string, { user_id: string; track_id: string; played_at: string }>();
    const artistMap = new Map<string, ArtistRow>();
    const trackArtistSet = new Set<string>();
    const trackArtistRows: TrackArtistRow[] = [];

    for (const it of items) {
      const tr = it?.track;
      if (!tr?.id) continue;

      // Track row (dedupe by id)
      if (!trackMap.has(tr.id)) {
        const artistName = Array.isArray(tr.artists)
          ? tr.artists.map((a: any) => a?.name).filter(Boolean).join(", ")
          : null;
        const img = tr.album?.images?.[0]?.url || null;

        trackMap.set(tr.id, {
          id: tr.id,
          name: tr.name ?? null,
          artist_name: artistName,
          album_image_url: img,
          preview_url: tr.preview_url ?? null,
        });
      }

      // Artist + link rows
      if (Array.isArray(tr.artists)) {
        for (const a of tr.artists) {
          if (!a?.id) continue;
          if (!artistMap.has(a.id)) {
            artistMap.set(a.id, { id: a.id, name: a.name ?? "" });
          }
          const key = `${tr.id}:${a.id}`;
          if (!trackArtistSet.has(key)) {
            trackArtistSet.add(key);
            trackArtistRows.push({ track_id: tr.id, artist_id: a.id });
          }
        }
      }

      // Listen row (dedupe by composite key)
      const playedAtIso = it.played_at ? new Date(it.played_at).toISOString() : null;
      if (playedAtIso) {
        const key = `${userId}:${tr.id}:${playedAtIso}`;
        if (!listenMap.has(key)) {
          listenMap.set(key, { user_id: userId, track_id: tr.id, played_at: playedAtIso });
        }
      }
    }

    const tracks = Array.from(trackMap.values());
    const listens = Array.from(listenMap.values());
    const artists = Array.from(artistMap.values());
    const trackArtists = trackArtistRows;

    // 7) Write with ADMIN client (bypass RLS) — unique rows only
    const { error: trErr } = await supabaseAdmin
      .from("spotify_tracks")
      .upsert(tracks, { onConflict: "id" }); // safe because we deduped
    if (trErr) return NextResponse.json({ error: trErr.message, where: "tracks.upsert" }, { status: 400 });

    const { error: arErr } = await supabaseAdmin
      .from("spotify_artists")
      .upsert(artists, { onConflict: "id" });
    if (arErr) return NextResponse.json({ error: arErr.message, where: "artists.upsert" }, { status: 400 });

    const { error: taErr } = await supabaseAdmin
      .from("spotify_track_artists")
      .upsert(trackArtists, { onConflict: "track_id,artist_id" });
    if (taErr) return NextResponse.json({ error: taErr.message, where: "track_artists.upsert" }, { status: 400 });

    const { error: lsErr } = await supabaseAdmin
      .from("spotify_listens")
      .upsert(listens, { onConflict: "user_id,track_id,played_at" });
    if (lsErr) return NextResponse.json({ error: lsErr.message, where: "listens.upsert" }, { status: 400 });

    return NextResponse.json({
      ok: true,
      apiUrl,
      items_received: items.length,
      imported: listens.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

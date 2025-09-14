// app/api/spotify/my/sync/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";
import { refreshToken as spotifyRefresh } from "@/lib/spotify";

export async function POST(req: Request) {
  try {
    if (!usingServiceRole) {
      return NextResponse.json(
        { error: "Service role key missing; cannot sync." },
        { status: 500 }
      );
    }

    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "1";

    // 1) Identify the user
    const user = await requireUserFromRequest(req);
    const userId = user.id;

    // 2) Read tokens with ADMIN client (bypass RLS)
    const { data: acct, error: acctErr } = await supabaseAdmin
      .from("spotify_accounts")
      .select("access_token, refresh_token, expires_at, last_after_cursor_ms")
      .eq("user_id", userId)
      .maybeSingle();

    if (acctErr) return NextResponse.json({ error: acctErr.message }, { status: 500 });
    if (!acct) return NextResponse.json({ error: "No Spotify account" }, { status: 409 });

    let accessToken = acct.access_token as string | null;
    let refreshToken = (acct.refresh_token as string | null) || null;
    // expires_at may be ISO/date or epoch seconds; normalize to ms
    let expMs = 0;
    if (acct.expires_at != null) {
      if (typeof acct.expires_at === "number") expMs = Number(acct.expires_at) * 1000;
      else expMs = new Date(acct.expires_at as any).getTime();
    }

    // 3) Ensure we have a fresh access token
    const needsRefresh = !accessToken || !expMs || expMs - Date.now() < 60_000;
    if (needsRefresh) {
      if (!refreshToken) {
        return NextResponse.json(
          { error: "Missing Spotify refresh token. Please reconnect." },
          { status: 401 }
        );
      }
      try {
        const t = await spotifyRefresh(refreshToken);
        accessToken = t.access_token;
        if (t.refresh_token) refreshToken = t.refresh_token;
        const newExpSec = Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) - 60;
        await supabaseAdmin
          .from("spotify_accounts")
          .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: newExpSec })
          .eq("user_id", userId);
        expMs = newExpSec * 1000;
      } catch (e: any) {
        return NextResponse.json({ error: String(e) }, { status: 401 });
      }
    }

    // 4) Determine cursor for incremental sync
    let afterMs: number | null = null;
    if (!full) {
      if (acct.last_after_cursor_ms != null) {
        afterMs = Number(acct.last_after_cursor_ms) || null;
      } else {
        const { data: last } = await supabaseAdmin
          .from("spotify_listens")
          .select("played_at")
          .eq("user_id", userId)
          .order("played_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last?.played_at) afterMs = new Date(last.played_at).getTime() + 1;
      }
    }

    // 5) Fetch recently played in small pages until no more or safety cap
    const maxPages = 5;
    let page = 0;
    let lastCursor: number | null = afterMs;
    const allItems: any[] = [];
    while (page < maxPages) {
      const apiUrl = new URL("https://api.spotify.com/v1/me/player/recently-played");
      apiUrl.searchParams.set("limit", "50");
      if (lastCursor) apiUrl.searchParams.set("after", String(lastCursor));

      let spRes = await fetch(apiUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (spRes.status === 401) {
        // Try a one-time forced refresh
        if (!refreshToken) return NextResponse.json({ error: "Spotify expired; reconnect" }, { status: 401 });
        try {
          const t = await spotifyRefresh(refreshToken);
          accessToken = t.access_token;
          const newExpSec = Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) - 60;
          await supabaseAdmin
            .from("spotify_accounts")
            .update({ access_token: accessToken, expires_at: newExpSec })
            .eq("user_id", userId);
          spRes = await fetch(apiUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
        } catch (e: any) {
          return NextResponse.json({ error: String(e) }, { status: 401 });
        }
      }

      if (!spRes.ok) {
        const text = await spRes.text();
        return NextResponse.json({ error: "Spotify API error", status: spRes.status, text }, { status: 502 });
      }
      const payload = await spRes.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) break;
      allItems.push(...items);
      const lastPlayed = items[items.length - 1]?.played_at;
      lastCursor = lastPlayed ? new Date(lastPlayed).getTime() + 1 : lastCursor;
      page += 1;
      // small delay to be nice to Spotify
      await new Promise((r) => setTimeout(r, 75));
    }
    if (!allItems.length) {
      // No new items; still mark last sync time for UX
      await supabaseAdmin
        .from("profiles")
        .update({ spotify_last_sync_at: new Date().toISOString() })
        .eq("id", userId);
      return NextResponse.json({ ok: true, items_received: 0, imported: 0, pages: 0 });
    }

    type TrackRow = {
      id: string;
      name: string | null;
      artist_name: string | null;
      album_image_url: string | null;
      preview_url: string | null;
    };

    type ArtistRow = { id: string; name: string; image_url: string | null };
    type TrackArtistRow = { track_id: string; artist_id: string };

    // 6) Build rows
    const trackMap = new Map<string, TrackRow>();
    const listenMap = new Map<string, { user_id: string; track_id: string; played_at: string }>();
    const artistMap = new Map<string, ArtistRow>();
    const trackArtistSet = new Set<string>();
    const trackArtistRows: TrackArtistRow[] = [];

    for (const it of allItems) {
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
            artistMap.set(a.id, { id: a.id, name: a.name ?? "", image_url: null });
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

    const artistIds = Array.from(artistMap.keys());
    if (artistIds.length) {
      for (let i = 0; i < artistIds.length; i += 50) {
        const slice = artistIds.slice(i, i + 50);
        const url = `https://api.spotify.com/v1/artists?ids=${slice.join(",")}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.ok) {
          const j = await resp.json();
          j.artists?.forEach((ar: any) => {
            const img = ar?.images?.[0]?.url || null;
            const existing = artistMap.get(ar.id);
            if (existing) existing.image_url = img;
          });
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

    // 8) Update cursors and profile last sync
    const latestMs = allItems[0]?.played_at ? new Date(allItems[0].played_at).getTime() : null;
    const newCursor = Math.max(
      0,
      ...allItems
        .map((it: any) => (it?.played_at ? new Date(it.played_at).getTime() : 0))
        .filter(Boolean)
    );
    await supabaseAdmin
      .from("spotify_accounts")
      .update({ last_recent_sync_at: new Date().toISOString(), last_after_cursor_ms: newCursor || latestMs || null })
      .eq("user_id", userId);

    await supabaseAdmin
      .from("profiles")
      .update({ spotify_last_sync_at: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({
      ok: true,
      pages: page,
      items_received: allItems.length,
      imported: listens.length,
      last_after_cursor_ms: newCursor || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

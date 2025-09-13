// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Accept both canonical and NEXT_PUBLIC_* names to match dashboard secrets
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

async function refreshSpotifyToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: Deno.env.get("SPOTIFY_CLIENT_ID")!,
    client_secret: Deno.env.get("SPOTIFY_CLIENT_SECRET")!,
  });
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token-refresh ${r.status}`);
  return r.json() as Promise<{ access_token: string; expires_in: number; refresh_token?: string }>;
}

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!/^Bearer\s+/.test(auth)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "1";

    const rls = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: udata, error: uerr } = await rls.auth.getUser();
    if (uerr || !udata?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    const userId = udata.user.id;

    const { data: acct, error: acctErr } = await admin
      .from("spotify_accounts")
      .select("access_token, refresh_token, expires_at, last_after_cursor_ms")
      .eq("user_id", userId)
      .maybeSingle();
    if (acctErr) throw acctErr;
    if (!acct) return new Response(JSON.stringify({ error: "No Spotify account" }), { status: 409 });

    let accessToken = acct.access_token as string | null;
    let refreshToken = (acct.refresh_token as string | null) || null;
    let expMs = 0;
    if (acct.expires_at != null) {
      expMs = typeof acct.expires_at === "number" ? Number(acct.expires_at) * 1000 : new Date(acct.expires_at as any).getTime();
    }

    const needsRefresh = !accessToken || !expMs || expMs - Date.now() < 60_000;
    if (needsRefresh) {
      if (!refreshToken) return new Response(JSON.stringify({ error: "Reconnect Spotify" }), { status: 401 });
      const t = await refreshSpotifyToken(refreshToken);
      accessToken = t.access_token;
      if (t.refresh_token) refreshToken = t.refresh_token;
      const newExpSec = Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) - 60;
      await admin
        .from("spotify_accounts")
        .update({ access_token: accessToken, refresh_token: refreshToken, expires_at: newExpSec })
        .eq("user_id", userId);
      expMs = newExpSec * 1000;
    }

    let afterMs: number | null = null;
    if (!full) {
      if (acct.last_after_cursor_ms != null) afterMs = Number(acct.last_after_cursor_ms) || null;
      if (!afterMs) {
        const { data: last } = await admin
          .from("spotify_listens")
          .select("played_at")
          .eq("user_id", userId)
          .order("played_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last?.played_at) afterMs = new Date(last.played_at).getTime() + 1;
      }
    }

    const allItems: any[] = [];
    const maxPages = 5;
    let lastCursor = afterMs;
    for (let page = 0; page < maxPages; page++) {
      const apiUrl = new URL("https://api.spotify.com/v1/me/player/recently-played");
      apiUrl.searchParams.set("limit", "50");
      if (lastCursor) apiUrl.searchParams.set("after", String(lastCursor));
      let spRes = await fetch(apiUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      if (spRes.status === 401 && refreshToken) {
        const t = await refreshSpotifyToken(refreshToken);
        accessToken = t.access_token;
        const newExpSec = Math.floor(Date.now() / 1000) + Number(t.expires_in || 3600) - 60;
        await admin.from("spotify_accounts").update({ access_token: accessToken, expires_at: newExpSec }).eq("user_id", userId);
        spRes = await fetch(apiUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
      }
      if (!spRes.ok) return new Response(JSON.stringify({ error: "Spotify API error", status: spRes.status, text: await spRes.text() }), { status: 502 });

      const payload = await spRes.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) break;
      allItems.push(...items);
      const lastPlayed = items[items.length - 1]?.played_at;
      lastCursor = lastPlayed ? new Date(lastPlayed).getTime() + 1 : lastCursor;
      await new Promise((r) => setTimeout(r, 75));
    }

    if (!allItems.length) {
      await admin.from("profiles").update({ spotify_last_sync_at: new Date().toISOString() }).eq("id", userId);
      return new Response(JSON.stringify({ ok: true, items_received: 0, imported: 0, pages: 0 }), { headers: { "Content-Type": "application/json" } });
    }

    type TrackRow = { id: string; name: string | null; artist_name: string | null; album_image_url: string | null; preview_url: string | null };
    type ArtistRow = { id: string; name: string; image_url: string | null };

    const trackMap = new Map<string, TrackRow>();
    const artistMap = new Map<string, ArtistRow>();
    const trackArtistSet = new Set<string>();
    const trackArtistRows: { track_id: string; artist_id: string }[] = [];
    const listens: { user_id: string; track_id: string; played_at: string }[] = [];

    for (const it of allItems) {
      const tr = it?.track;
      if (!tr?.id) continue;

      if (!trackMap.has(tr.id)) {
        const artistName = Array.isArray(tr.artists) ? tr.artists.map((a: any) => a?.name).filter(Boolean).join(", ") : null;
        const img = tr.album?.images?.[0]?.url || null;
        trackMap.set(tr.id, { id: tr.id, name: tr.name ?? null, artist_name: artistName, album_image_url: img, preview_url: tr.preview_url ?? null });
      }

      if (Array.isArray(tr.artists)) {
        for (const a of tr.artists) {
          if (!a?.id) continue;
          if (!artistMap.has(a.id)) artistMap.set(a.id, { id: a.id, name: a.name ?? "", image_url: null });
          const key = `${tr.id}:${a.id}`;
          if (!trackArtistSet.has(key)) { trackArtistSet.add(key); trackArtistRows.push({ track_id: tr.id, artist_id: a.id }); }
        }
      }

      const playedAtIso = it.played_at ? new Date(it.played_at).toISOString() : null;
      if (playedAtIso) listens.push({ user_id: userId, track_id: tr.id, played_at: playedAtIso });
    }

    // enrich artists with images
    const artistIds = Array.from(artistMap.keys());
    for (let i = 0; i < artistIds.length; i += 50) {
      const slice = artistIds.slice(i, i + 50);
      const url = `https://api.spotify.com/v1/artists?ids=${slice.join(",")}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (resp.ok) {
        const j = await resp.json();
        j.artists?.forEach((ar: any) => {
          const img = ar?.images?.[0]?.url || null;
          const ex = artistMap.get(ar.id);
          if (ex) ex.image_url = img;
        });
      }
    }

    const { error: trErr } = await admin.from("spotify_tracks").upsert(Array.from(trackMap.values()), { onConflict: "id" });
    if (trErr) throw trErr;
    const { error: arErr } = await admin.from("spotify_artists").upsert(Array.from(artistMap.values()), { onConflict: "id" });
    if (arErr) throw arErr;
    const { error: taErr } = await admin.from("spotify_track_artists").upsert(trackArtistRows, { onConflict: "track_id,artist_id" });
    if (taErr) throw taErr;
    const { error: lsErr } = await admin.from("spotify_listens").upsert(listens, { onConflict: "user_id,track_id,played_at" });
    if (lsErr) throw lsErr;

    const newCursor = Math.max(0, ...allItems.map((it: any) => (it?.played_at ? new Date(it.played_at).getTime() : 0)).filter(Boolean));
    await admin.from("spotify_accounts").update({ last_recent_sync_at: new Date().toISOString(), last_after_cursor_ms: newCursor || null }).eq("user_id", userId);
    await admin.from("profiles").update({ spotify_last_sync_at: new Date().toISOString() }).eq("id", userId);

    return new Response(JSON.stringify({ ok: true, items_received: allItems.length, imported: listens.length, last_after_cursor_ms: newCursor || null }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

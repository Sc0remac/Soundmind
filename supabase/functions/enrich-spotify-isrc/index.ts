// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

async function refreshAccessToken(refresh_token: string) {
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
  if (!r.ok) throw new Error(`Spotify refresh failed (${r.status})`);
  return r.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function getUserAccessToken(admin: any, userId: string, forceRefresh = false) {
  const { data, error } = await admin
    .from("spotify_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("Spotify not connected");
  let { access_token, refresh_token, expires_at } = data as any;
  const willExpire = forceRefresh || (typeof expires_at === "number" ? Date.now() / 1000 > expires_at - 60 : true);
  if (!access_token || willExpire) {
    if (!refresh_token) throw new Error("Missing Spotify refresh token");
    const j = await refreshAccessToken(refresh_token);
    access_token = j.access_token;
    const newExpiresAt = Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600);
    await admin.from("spotify_accounts").update({ access_token, expires_at: newExpiresAt }).eq("user_id", userId);
  }
  return access_token as string;
}

async function fetchTracksBatch(token: string, ids: string[]) {
  const url = new URL("https://api.spotify.com/v1/tracks");
  url.searchParams.set("ids", ids.join(","));
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Spotify /v1/tracks ${r.status}`);
  return r.json() as Promise<{ tracks: any[] }>;
}

async function fetchArtistsBatch(token: string, ids: string[]) {
  const out: { artists: any[] } = { artists: [] };
  for (let i = 0; i < ids.length; i += 50) {
    const slice = ids.slice(i, i + 50);
    const u = new URL("https://api.spotify.com/v1/artists");
    u.searchParams.set("ids", slice.join(","));
    const r = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (r.ok) {
      const j = await r.json();
      out.artists.push(...(j?.artists || []));
    }
    if (i + 50 < ids.length) await new Promise((res) => setTimeout(res, 60));
  }
  return out;
}

serve(async (req) => {
  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!/^Bearer\s+/.test(auth)) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
    const rls = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false, autoRefreshToken: false } });
    const admin = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u } = await rls.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
    const userId = u.user.id;

    const { data: listens, error: lErr } = await admin
      .from("spotify_listens")
      .select("track_id")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(200);
    if (lErr) throw new Error(lErr.message);
    const recentIds = Array.from(new Set((listens || []).map((r: any) => r.track_id)));
    if (!recentIds.length) return new Response(JSON.stringify({ ok: true, looked_up: 0, updated: 0, note: "No recent listens" }), { headers: { "Content-Type": "application/json" } });

    const { data: tracks } = await admin
      .from("spotify_tracks")
      .select("id, isrc, preview_url, name")
      .in("id", recentIds);
    const existing = new Map((tracks || []).map((t: any) => [t.id, t]));
    const needLookup = recentIds.filter((id) => {
      const row = existing.get(id);
      return !row || !row.isrc || row.preview_url == null || !row.name;
    });
    if (!needLookup.length) return new Response(JSON.stringify({ ok: true, looked_up: 0, updated: 0, note: "All recent tracks already have ISRC" }), { headers: { "Content-Type": "application/json" } });

    let token = await getUserAccessToken(admin, userId);
    let looked = 0;
    let updated = 0;

    for (let i = 0; i < needLookup.length; i += 50) {
      const slice = needLookup.slice(i, i + 50);
      let j;
      try {
        j = await fetchTracksBatch(token, slice);
      } catch (e) {
        token = await getUserAccessToken(admin, userId, true);
        j = await fetchTracksBatch(token, slice);
      }
      looked += slice.length;

      // Build rows
      const trackMap = new Map<string, any>();
      const artistMap = new Map<string, any>();
      const linkRows: { track_id: string; artist_id: string }[] = [];
      const linkSet = new Set<string>();
      for (const tr of j.tracks || []) {
        if (!tr?.id) continue;
        trackMap.set(tr.id, {
          id: tr.id,
          name: tr.name || null,
          preview_url: tr.preview_url ?? null,
          isrc: tr.external_ids?.isrc ?? null,
          album_image_url: tr.album?.images?.[0]?.url || null,
        });
        (tr.artists || []).forEach((a: any) => {
          if (!a?.id) return;
          if (!artistMap.has(a.id)) artistMap.set(a.id, { id: a.id, name: a.name ?? "", image_url: null });
          const key = `${tr.id}:${a.id}`;
          if (!linkSet.has(key)) { linkSet.add(key); linkRows.push({ track_id: tr.id, artist_id: a.id }); }
        });
      }

      const artistIds = Array.from(artistMap.keys());
      if (artistIds.length) {
        const art = await fetchArtistsBatch(token, artistIds);
        for (const ar of art.artists || []) {
          const ex = artistMap.get(ar.id);
          if (ex) ex.image_url = ar?.images?.[0]?.url || null;
        }
      }

      const trackRows = Array.from(trackMap.values());
      const artistRows = Array.from(artistMap.values());
      if (trackRows.length) {
        const { error: uErr, count } = await admin
          .from("spotify_tracks")
          .upsert(trackRows, { onConflict: "id", ignoreDuplicates: false, count: "exact" });
        if (uErr) throw new Error(uErr.message);
        updated += count || 0;
      }
      if (artistRows.length) {
        const { error: arErr } = await admin.from("spotify_artists").upsert(artistRows, { onConflict: "id" });
        if (arErr) throw new Error(arErr.message);
      }
      if (linkRows.length) {
        const { error: lnErr } = await admin.from("spotify_track_artists").upsert(linkRows, { onConflict: "track_id,artist_id" });
        if (lnErr) throw new Error(lnErr.message);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    return new Response(JSON.stringify({ ok: true, looked_up: looked, updated }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});

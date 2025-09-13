// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

async function fetchDeezerTrack(isrc: string, existingId?: string | null) {
  const trackUrl = existingId ? `https://api.deezer.com/track/${existingId}` : `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;
  const trackRes = await fetch(trackUrl);
  if (!trackRes.ok) return null;
  const track = await trackRes.json();
  if (!track || !track.id) return null;
  let genres: string[] = [];
  const albumId = track.album?.id;
  if (albumId) {
    try {
      const albumRes = await fetch(`https://api.deezer.com/album/${albumId}`);
      if (albumRes.ok) {
        const albumJson = await albumRes.json();
        const data = albumJson?.genres?.data || [];
        genres = data.map((g: any) => g.name).filter(Boolean);
      }
    } catch {}
  }
  return { id: track.id, bpm: track.bpm, gain: track.gain, genres } as { id?: number; bpm?: number; gain?: number; genres?: string[] };
}

serve(async () => {
  try {
    const admin = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: rows, error } = await admin
      .from("spotify_tracks")
      .select("id,name,isrc,tempo,bpm,gain,genre_primary,genre_tags,deezer_track_id,meta_provider")
      .not("isrc", "is", null)
      .or("tempo.is.null,bpm.is.null,gain.is.null,deezer_track_id.is.null")
      .or("tempo.is.null,tempo.eq.0,bpm.is.null,bpm.eq.0,gain.is.null,gain.eq.0,genre_primary.is.null,deezer_track_id.is.null")
      .limit(200);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    if (!rows?.length) return new Response(JSON.stringify({ ok: true, looked_up: 0, updated: 0 }), { headers: { "Content-Type": "application/json" } });

    let updated = 0;
    for (const r of rows as any[]) {
      if (!r.isrc) continue;
      try {
        const d = await fetchDeezerTrack(r.isrc, r.deezer_track_id);
        if (!d) continue;
        const tags = (d.genres?.length ? Array.from(new Set([...(r.genre_tags || []), ...d.genres])) : r.genre_tags) as string[] | null;
        const patch: any = {
          id: r.id,
          name: r.name,
          deezer_track_id: d.id?.toString() ?? r.deezer_track_id,
          tempo: typeof d.bpm === "number" ? d.bpm : r.tempo,
          bpm: typeof d.bpm === "number" ? d.bpm : r.bpm,
          gain: typeof d.gain === "number" ? d.gain : r.gain,
          genre_primary: d.genres?.[0] ?? r.genre_primary,
          genre_tags: tags,
          last_enriched_at: new Date().toISOString(),
          meta_provider: { ...(r.meta_provider || {}), deezer: true },
        };
        const { error: updErr } = await admin.from("spotify_tracks").upsert(patch, { onConflict: "id" });
        if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 });
        updated++;
      } catch {}
      await new Promise((res) => setTimeout(res, 120));
    }
    return new Response(JSON.stringify({ ok: true, looked_up: rows.length, updated }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

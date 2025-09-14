// app/api/enrich/deezer/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";

type DeezerTrack = {
  id?: number;
  bpm?: number;
  gain?: number;
  genres?: string[];
};

async function fetchDeezerByISRC(isrc: string): Promise<DeezerTrack | null> {
  // Undocumented but widely used endpoint: /track/isrc:<ISRC>
  const url = `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json && json.id) {
    return { id: json.id, bpm: json.bpm, gain: json.gain };
  }
  return null;
}

async function fetchDeezerTrack(
  isrc: string,
  existingId?: string | null
): Promise<DeezerTrack | null> {
  const trackUrl = existingId
    ? `https://api.deezer.com/track/${existingId}`
    : `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;

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
    } catch {
      /* ignore */
    }
  }

  return { id: track.id, bpm: track.bpm, gain: track.gain, genres };
}

export async function POST() {
  if (!usingServiceRole) {
    return NextResponse.json({ error: "Missing service role" }, { status: 500 });
  }

  // Pick tracks that have an ISRC but missing bpm/genre/gain info
  const { data: rows, error } = await supabaseAdmin
    .from("spotify_tracks")
    .select(
      "id,name,isrc,tempo,bpm,gain,genre_primary,genre_tags,deezer_track_id,meta_provider"
    )
    .not("isrc", "is", null)
    .or("tempo.is.null,bpm.is.null,gain.is.null,deezer_track_id.is.null")
    // some rows may have zero values rather than null; treat 0 as missing
    .or(
      "tempo.is.null,tempo.eq.0,bpm.is.null,bpm.eq.0,gain.is.null,gain.eq.0,genre_primary.is.null,deezer_track_id.is.null"
    )
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!rows?.length) {
    return NextResponse.json({ ok: true, looked_up: 0, updated: 0 });
  }

  let updated = 0;
  for (const r of rows as any[]) {
    if (!r.isrc) continue;
    try {
      const d = await fetchDeezerTrack(r.isrc, r.deezer_track_id);
      if (!d) continue;

      const tags = d.genres?.length
        ? Array.from(new Set([...(r.genre_tags || []), ...d.genres]))
        : r.genre_tags;

      const patch: any = {
        // include name so upsert doesn't trip NOT NULL
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

      const { error: updErr } = await supabaseAdmin
        .from("spotify_tracks")
        .upsert(patch, { onConflict: "id" });

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      updated++;
    } catch {
      /* ignore */
    }

    // Be gentle to Deezer
    await new Promise((res) => setTimeout(res, 120));
  }

  return NextResponse.json({ ok: true, looked_up: rows.length, updated });
}

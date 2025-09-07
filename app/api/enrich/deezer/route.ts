// app/api/enrich/deezer/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";

type DeezerTrack = {
  id?: number;
  bpm?: number;
  gain?: number;
};

async function fetchDeezerByISRC(isrc: string): Promise<DeezerTrack | null> {
  // Undocumented but widely used endpoint: /track/isrc:<ISRC>
  const url = `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json && json.id) return { id: json.id, bpm: json.bpm, gain: json.gain };
  return null;
}

export async function POST() {
  if (!usingServiceRole) {
    return NextResponse.json({ error: "Missing service role" }, { status: 500 });
  }

  // Pick tracks that have an ISRC but no tempo/bpm or gain yet
  const { data: rows, error } = await supabaseAdmin
    .from("spotify_tracks")
    // need the existing name to satisfy NOT NULL during upsert
    .select("id,name,isrc,tempo,bpm,gain,deezer_track_id,meta_provider")
    .not("isrc", "is", null)
    // some rows may have zero values rather than null; treat 0 as missing
    .or(
      "tempo.is.null,tempo.eq.0,bpm.is.null,bpm.eq.0,gain.is.null,gain.eq.0,deezer_track_id.is.null"
    )
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ ok: true, looked_up: 0, updated: 0 });

  let updated = 0;
  for (const r of rows) {
    if (!r.isrc) continue;
    try {
      const d = await fetchDeezerByISRC(r.isrc);
      if (!d) continue;
      const patch: any = {
        // include name so upsert doesn't trip NOT NULL
        id: r.id,
        name: r.name,
        deezer_track_id: d.id?.toString() ?? r.deezer_track_id,
        tempo: typeof d.bpm === "number" ? d.bpm : r.tempo,
        bpm: typeof d.bpm === "number" ? d.bpm : r.bpm,
        gain: typeof d.gain === "number" ? d.gain : r.gain,
        last_enriched_at: new Date().toISOString(),
        meta_provider: { ...(r.meta_provider || {}), deezer: true },
      };
      const { error: updErr } = await supabaseAdmin
        .from("spotify_tracks")
        .upsert(patch, { onConflict: "id" });
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      updated++;
    } catch {
      /* ignore */
    }
    // Be gentle to Deezer
    await new Promise((res) => setTimeout(res, 120));
  }

  return NextResponse.json({ ok: true, looked_up: rows.length, updated });
}

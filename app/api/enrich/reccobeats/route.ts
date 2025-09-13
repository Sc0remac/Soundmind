// app/api/enrich/reccobeats/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";

type Feature = {
  href?: string;
  acousticness?: number;
  danceability?: number;
  energy?: number;
  instrumentalness?: number;
  key?: number;
  liveness?: number;
  loudness?: number;
  mode?: number;
  speechiness?: number;
  tempo?: number;
  valence?: number;
};

function extractSpotifyId(href?: string | null) {
  if (!href) return null;
  try {
    // Expect: https://open.spotify.com/track/{id}
    const u = new URL(href);
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.indexOf("track");
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // ignore
  }
  // fallback: last path segment after '/'
  const m = href.match(/track\/([A-Za-z0-9]+)/);
  return m?.[1] || null;
}

export async function POST() {
  if (!usingServiceRole) {
    return NextResponse.json({ ok: false, error: "Missing service role" }, { status: 500 });
  }

  // 1) Find tracks that are missing audio features
  const { data: rows, error } = await supabaseAdmin
    .from("spotify_tracks")
    .select(
      [
        "id",
        "name",
        "meta_provider",
        "tempo",
        "bpm",
        "danceability",
        "energy",
        "acousticness",
        "instrumentalness",
        "liveness",
        "loudness",
        "speechiness",
        "valence",
        "key",
        "mode",
      ].join(",")
    )
    // Any audio-feature missing qualifies
    .or(
      [
        // Treat null or zero as missing where appropriate
        "tempo.is.null",
        "tempo.eq.0",
        "bpm.is.null",
        "bpm.eq.0",
        "danceability.is.null",
        "danceability.eq.0",
        "energy.is.null",
        "energy.eq.0",
        "acousticness.is.null",
        "acousticness.eq.0",
        "instrumentalness.is.null",
        "instrumentalness.eq.0",
        "liveness.is.null",
        "liveness.eq.0",
        "loudness.is.null",
        // loudness 0 is unlikely for mastered tracks; consider 0 as missing
        "loudness.eq.0",
        "speechiness.is.null",
        "speechiness.eq.0",
        "valence.is.null",
        "valence.eq.0",
        "key.is.null",
        "mode.is.null",
      ].join(",")
    )
    .limit(200);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const candidates = (rows || []).filter((r) => r?.id);
  if (!candidates.length) {
    return NextResponse.json({ ok: true, looked_up: 0, updated: 0 });
  }

  // 2) Query reccobeats in chunks
  const ids = candidates.map((r: any) => r.id as string);
  const chunkSize = 100; // conservative
  const featuresById = new Map<string, Feature>();
  let looked = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    const url = new URL("https://api.reccobeats.com/v1/audio-features");
    url.searchParams.set("ids", slice.join(","));
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    // Treat non-200 as empty; we'll just skip
    if (res.ok) {
      const j = (await res.json()) as { content?: Feature[] };
      for (const f of j?.content || []) {
        const sid = extractSpotifyId(f.href);
        if (sid) featuresById.set(sid, f);
      }
    }
    looked += slice.length;
    // small delay to be polite
    if (i + chunkSize < ids.length) await new Promise((r) => setTimeout(r, 100));
  }

  if (featuresById.size === 0) {
    return NextResponse.json({ ok: true, looked_up: looked, updated: 0 });
  }

  // 3) Build upsert rows (include name to satisfy NOT NULL on inserts, though all ids exist)
  const nowIso = new Date().toISOString();
  const patchRows: any[] = [];
  let updated = 0;

  for (const r of candidates) {
    const f = featuresById.get(r.id);
    if (!f) continue;

    const patch: any = {
      id: r.id,
      name: r.name, // carry to satisfy NOT NULL in case upsert path inserts
      tempo: typeof f.tempo === "number" ? f.tempo : r.tempo,
      bpm: typeof f.tempo === "number" ? f.tempo : r.bpm,
      danceability:
        typeof f.danceability === "number" ? Number(f.danceability.toFixed(3)) : r.danceability,
      energy: typeof f.energy === "number" ? Number(f.energy.toFixed(3)) : r.energy,
      acousticness:
        typeof f.acousticness === "number" ? Number(f.acousticness.toFixed(3)) : r.acousticness,
      instrumentalness:
        typeof f.instrumentalness === "number"
          ? Number(f.instrumentalness.toFixed(5))
          : r.instrumentalness,
      liveness: typeof f.liveness === "number" ? Number(f.liveness.toFixed(3)) : r.liveness,
      loudness: typeof f.loudness === "number" ? Number(f.loudness.toFixed(3)) : r.loudness,
      speechiness: typeof f.speechiness === "number" ? Number(f.speechiness.toFixed(3)) : r.speechiness,
      valence: typeof f.valence === "number" ? Number(f.valence.toFixed(3)) : r.valence,
      key: typeof f.key === "number" ? f.key : r.key,
      mode: typeof f.mode === "number" ? f.mode : r.mode,
      features_fetched_at: nowIso,
      last_enriched_at: nowIso,
      meta_provider: {
        ...(typeof r.meta_provider === "object" && r.meta_provider ? r.meta_provider : {}),
        reccobeats: { ok: true, fetched_at: nowIso },
      },
    };

    patchRows.push(patch);
    updated++;
  }

  if (patchRows.length) {
    const { error: upErr } = await supabaseAdmin
      .from("spotify_tracks")
      .upsert(patchRows, { onConflict: "id", ignoreDuplicates: false });
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, looked_up: looked, updated });
}

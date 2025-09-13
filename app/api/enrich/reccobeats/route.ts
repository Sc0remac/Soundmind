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

export async function POST(req: Request) {
  if (!usingServiceRole) {
    return NextResponse.json({ ok: false, error: "Missing service role" }, { status: 500 });
  }

  // Optional targeted mode: allow `?ids=a,b,c` to update specific tracks
  const url = new URL(req.url);
  const idParam = url.searchParams.get("ids");

  const selectMissing = async (limit: number) =>
    await supabaseAdmin
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
      .or(
        [
          // Consider only these as invalid when zero
          "tempo.is.null",
          "tempo.eq.0",
          "bpm.is.null",
          "bpm.eq.0",
          // others only when null (0 can be a valid value)
          "danceability.is.null",
          "energy.is.null",
          "acousticness.is.null",
          "instrumentalness.is.null",
          "liveness.is.null",
          "loudness.is.null",
          "speechiness.is.null",
          "valence.is.null",
          "key.is.null",
          "mode.is.null",
        ].join(",")
      )
      .limit(limit);

  let totalLooked = 0;
  let totalUpdated = 0;
  const maxTotal = 5000;
  const pageSize = idParam ? 200 : 500;

  // Build list of IDs to process: targeted or by pages of missing
  const gatherCandidates = async (): Promise<any[]> => {
    if (idParam) {
      const ids = idParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!ids.length) return [];
      const { data } = await supabaseAdmin
        .from("spotify_tracks")
        .select("id,name,meta_provider,tempo,bpm,danceability,energy,acousticness,instrumentalness,liveness,loudness,speechiness,valence,key,mode")
        .in("id", ids)
        .limit(ids.length);
      return (data || []).filter((r) => r?.id);
    }
    const { data } = await selectMissing(pageSize);
    return (data || []).filter((r) => r?.id);
  };

  while (totalLooked < maxTotal) {
    const batch = await gatherCandidates();
    if (!batch.length) break;

    const ids = batch.map((r: any) => r.id as string);
    const chunkSize = 40; // Reccobeats API limit: 1..40 ids per request
    const featuresById = new Map<string, Feature>();

    for (let i = 0; i < ids.length; i += chunkSize) {
      const slice = ids.slice(i, i + chunkSize);
      const rq = new URL("https://api.reccobeats.com/v1/audio-features");
      rq.searchParams.set("ids", slice.join(","));
      const res = await fetch(rq.toString(), { next: { revalidate: 0 } });
      if (res.ok) {
        const j = (await res.json()) as { content?: Feature[] };
        for (const f of j?.content || []) {
          const sid = extractSpotifyId(f.href);
          if (sid) featuresById.set(sid, f);
        }
      }
      totalLooked += slice.length;
      if (i + chunkSize < ids.length) await new Promise((r) => setTimeout(r, 80));
    }

    if (featuresById.size === 0) break;

    const nowIso = new Date().toISOString();
    const patchRows: any[] = [];
    for (const r of batch) {
      const f = featuresById.get(r.id);
      if (!f) continue;
      const patch: any = {
        id: r.id,
        // Only include name if present to avoid violating NOT NULL with null
        ...(r.name ? { name: r.name } : {}),
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
        speechiness:
          typeof f.speechiness === "number" ? Number(f.speechiness.toFixed(3)) : r.speechiness,
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
    }

    if (patchRows.length) {
      const { error: upErr } = await supabaseAdmin
        .from("spotify_tracks")
        .upsert(patchRows, { onConflict: "id", ignoreDuplicates: false });
      if (upErr)
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
      totalUpdated += patchRows.length;
    }

    // If targeted mode, finish after one pass
    if (idParam) break;
    // Small delay before next batch
    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ ok: true, looked_up: totalLooked, updated: totalUpdated });
}

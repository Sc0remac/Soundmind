// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const admin = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });
    const url = new URL(req.url);
    const maxTotal = Math.max(100, Math.min(20000, Number(url.searchParams.get("limit") || 5000)));

    async function consolidateBpmTempo() {
      const { data: a } = await admin.from("spotify_tracks").select("id,tempo,bpm").or("bpm.is.null,bpm.eq.0").gt("tempo", 0).limit(10000);
      const rowsA = (a || []).filter((r: any) => typeof r.tempo === "number" && r.tempo > 0);
      if (rowsA.length) {
        const patches = rowsA.map((r: any) => ({ id: r.id, bpm: r.tempo }));
        await admin.from("spotify_tracks").upsert(patches, { onConflict: "id" });
      }
      const { data: b } = await admin.from("spotify_tracks").select("id,tempo,bpm").or("tempo.is.null,tempo.eq.0").gt("bpm", 0).limit(10000);
      const rowsB = (b || []).filter((r: any) => typeof r.bpm === "number" && r.bpm > 0);
      if (rowsB.length) {
        const patches = rowsB.map((r: any) => ({ id: r.id, tempo: r.bpm }));
        await admin.from("spotify_tracks").upsert(patches, { onConflict: "id" });
      }
    }

    async function backfillMissing(maxTotalRuns = 5000) {
      let totalLooked = 0;
      let totalUpdated = 0;
      const pageSize = 500;
      while (totalLooked < maxTotalRuns) {
        const { data: rows } = await admin
          .from("spotify_tracks")
          .select("id,name,meta_provider,tempo,bpm,danceability,energy,acousticness,instrumentalness,liveness,loudness,speechiness,valence,key,mode")
          .or([
            "tempo.is.null","tempo.eq.0","bpm.is.null","bpm.eq.0",
            "danceability.is.null","energy.is.null","acousticness.is.null","instrumentalness.is.null",
            "liveness.is.null","loudness.is.null","speechiness.is.null","valence.is.null","key.is.null","mode.is.null",
          ].join(","))
          .limit(pageSize);

        const batch = (rows || []).filter((r: any) => r?.id);
        if (!batch.length) break;
        const ids = batch.map((r: any) => r.id as string);

        const featuresById = new Map<string, any>();
        for (let i = 0; i < ids.length; i += 40) {
          const slice = ids.slice(i, i + 40);
          const rq = new URL("https://api.reccobeats.com/v1/audio-features");
          rq.searchParams.set("ids", slice.join(","));
          const res = await fetch(rq.toString());
          if (res.ok) {
            const j = (await res.json()) as { content?: any[] };
            for (const f of j?.content || []) {
              const m = String(f?.href || "").match(/track\/([A-Za-z0-9]+)/);
              const sid = m?.[1];
              if (sid) featuresById.set(sid, f);
            }
          }
          totalLooked += slice.length;
          if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 80));
        }

        const nowIso = new Date().toISOString();
        const patches: any[] = [];
        for (const r of batch) {
          const f = featuresById.get(r.id);
          if (!f) continue;
          patches.push({
            id: r.id,
            ...(r.name ? { name: r.name } : {}),
            tempo: typeof f.tempo === "number" ? f.tempo : r.tempo,
            bpm: typeof f.tempo === "number" ? f.tempo : r.bpm,
            danceability: typeof f.danceability === "number" ? Number(f.danceability.toFixed(3)) : r.danceability,
            energy: typeof f.energy === "number" ? Number(f.energy.toFixed(3)) : r.energy,
            acousticness: typeof f.acousticness === "number" ? Number(f.acousticness.toFixed(3)) : r.acousticness,
            instrumentalness: typeof f.instrumentalness === "number" ? Number(f.instrumentalness.toFixed(5)) : r.instrumentalness,
            liveness: typeof f.liveness === "number" ? Number(f.liveness.toFixed(3)) : r.liveness,
            loudness: typeof f.loudness === "number" ? Number(f.loudness.toFixed(3)) : r.loudness,
            speechiness: typeof f.speechiness === "number" ? Number(f.speechiness.toFixed(3)) : r.speechiness,
            valence: typeof f.valence === "number" ? Number(f.valence.toFixed(3)) : r.valence,
            key: typeof f.key === "number" ? f.key : r.key,
            mode: typeof f.mode === "number" ? f.mode : r.mode,
            features_fetched_at: nowIso,
            last_enriched_at: nowIso,
            meta_provider: { ...(r.meta_provider || {}), reccobeats: { ok: true, fetched_at: nowIso } },
          });
        }
        if (patches.length) {
          const { error } = await admin.from("spotify_tracks").upsert(patches, { onConflict: "id" });
          if (error) throw error;
          totalUpdated += patches.length;
        }
        await new Promise((r) => setTimeout(r, 120));
      }
      return { totalLooked, totalUpdated };
    }

    await consolidateBpmTempo();
    const res = await backfillMissing(maxTotal);
    return new Response(JSON.stringify({ ok: true, ...res }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

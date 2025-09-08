// app/api/insights/soundmap/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient, fetchJoinedRows, energyBucket } from "../_common";

export async function GET(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");
    const mode = (searchParams.get("mode") || "genre") === "artist" ? "artist" : "genre";
    const split = searchParams.get("split");
    const genre = searchParams.get("genre");
    const artist = searchParams.get("artist");
    const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

    const rows = await fetchJoinedRows({ client, userId, sinceIso, split, genre, artist });
    type Agg = { count: number; mean_perf: number; mean_mood: number };
    const agg = new Map<string, Agg>(); // key = `${label}|${energy}`

    for (const r of rows) {
      const label = (mode === "genre" ? r.pre_top_genre : r.pre_top_artist) || "(unknown)";
      const e = energyBucket(r.pre_energy);
      if (!label || !e) continue;

      const key = `${label}|${e}`;
      const entry = agg.get(key) || { count: 0, mean_perf: 0, mean_mood: 0 };
      const perf = Number.isFinite(r.tonnage_z as any) ? Number(r.tonnage_z) : 0;
      const mood = Number.isFinite(r.mood_delta as any) ? Number(r.mood_delta) : 0;

      // online means
      const newCount = entry.count + 1;
      entry.mean_perf = entry.mean_perf + (perf - entry.mean_perf) / newCount;
      entry.mean_mood = entry.mean_mood + (mood - entry.mean_mood) / newCount;
      entry.count = newCount;
      agg.set(key, entry);
    }

    const cells = Array.from(agg.entries()).map(([k, v]) => {
      const [label, energy] = k.split("|");
      return {
        label,
        energy,
        count: v.count,
        perf: +v.mean_perf.toFixed(2),
        mood: +v.mean_mood.toFixed(2),
      };
    });

    return NextResponse.json({ days, mode, cells });
  } catch (e: any) {
    const status = e?.status || 500;
    console.error("[/api/insights/soundmap] error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

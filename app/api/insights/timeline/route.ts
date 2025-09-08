// app/api/insights/timeline/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient, fetchJoinedRows } from "../_common";

export async function GET(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");
    const split = searchParams.get("split");
    const genre = searchParams.get("genre");
    const artist = searchParams.get("artist");
    const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

    const rows = await fetchJoinedRows({ client, userId, sinceIso, split, genre, artist });

    // Group by YYYY-MM-DD
    const daysMap = new Map<string, any[]>();
    for (const r of rows) {
      const d = new Date(r.started_at);
      const key = isNaN(d.getTime()) ? "Unknown" : d.toISOString().slice(0, 10);
      const arr = daysMap.get(key) || [];
      arr.push({
        workout_id: r.workout_id,
        started_at: r.started_at,
        split_name: r.split_name,
        tonnage: r.tonnage,
        sets_count: r.sets_count,
        tonnage_z: r.tonnage_z ?? null, // <-- include Z for UI color/impact display
        pre_energy: r.pre_energy,
        pre_valence: r.pre_valence,
        pre_top_genre: r.pre_top_genre,
        pre_top_artist: r.pre_top_artist,
        mood_delta: r.mood_delta,
      });
      daysMap.set(key, arr);
    }

    const items = [...daysMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, sessions]) => ({ date, sessions }));

    return NextResponse.json({ items });
  } catch (e: any) {
    const status = e?.status || 500;
    console.error("[/api/insights/timeline] error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

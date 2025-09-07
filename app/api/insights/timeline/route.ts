// app/api/insights/timeline/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";
// bpm bands no longer needed

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");
    const genre = searchParams.get("genre");
    const artist = searchParams.get("artist");
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("v_correlations_ready")
      .select(
        "workout_id, started_at, split_name, tonnage, sets_count, tonnage_z, pre_energy, pre_valence, pre_top_genre, pre_top_artist, mood_delta"
      )
      .eq("user_id", userId)
      .gte("started_at", since)
      .order("started_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const daysMap = new Map<string, any[]>();
    for (const r of data || []) {
      if (genre && (r.pre_top_genre || "") !== genre) continue;
      if (artist && (r.pre_top_artist || "") !== artist) continue;
      const d = new Date(r.started_at);
      const key = d.toISOString().slice(0, 10);
      const arr = daysMap.get(key) || [];
      arr.push({
        id: r.workout_id,
        time: r.started_at,
        split: r.split_name,
        tonnage: r.tonnage,
        sets: r.sets_count,
        z: r.tonnage_z,
        pre: {
          energy: r.pre_energy,
          valence: r.pre_valence,
          genre: r.pre_top_genre,
          artist: r.pre_top_artist,
        },
        mood_delta: r.mood_delta,
      });
      daysMap.set(key, arr);
    }

    const items = [...daysMap.entries()].map(([date, sessions]) => ({
      date,
      sessions,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 401 });
  }
}

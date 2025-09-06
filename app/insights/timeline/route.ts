// app/api/insights/timeline/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/auth";
import { bpmBand } from "@/lib/stats";

export async function GET(req: Request) {
  const auth = await requireUserFromRequest(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.user.id;

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") || "30");
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  const { data, error } = await supabaseServer
    .from("v_correlations_ready")
    .select(
      "workout_id, started_at, split_name, tonnage, sets_count, tonnage_z, pre_bpm, pre_energy, pre_valence, pre_top_genre, mood_delta"
    )
    .eq("user_id", userId)
    .gte("started_at", since)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const daysMap = new Map<string, any[]>();
  for (const r of data || []) {
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
        bpm: r.pre_bpm,
        band: bpmBand(r.pre_bpm),
        energy: r.pre_energy,
        valence: r.pre_valence,
        genre: r.pre_top_genre,
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
}

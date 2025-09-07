// app/api/insights/soundmap/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";
import { bpmBand } from "@/lib/stats";
// no bpm bands in the new sound map

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "90");
    const mode = searchParams.get("mode") === "artist" ? "artist" : "genre";
    const genre = searchParams.get("genre");
    const artist = searchParams.get("artist");
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("v_correlations_ready")
      .select("started_at, tonnage_z, mood_delta, pre_bpm, pre_energy")
      .select("started_at, tonnage_z, mood_delta, pre_energy, pre_top_genre, pre_top_artist")
      .eq("user_id", userId)
      .gte("started_at", since);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type Cell = { count: number; mean_perf: number; mean_mood: number };
    const grid = new Map<string, Cell>();

    const bandE = (e: number | null) =>
      e == null ? null : e < 0.4 ? "low" : e < 0.7 ? "mid" : "high";

    for (const r of data || []) {
      const bandB = bpmBand(r.pre_bpm);
      if (genre && (r.pre_top_genre || "") !== genre) continue;
      if (artist && (r.pre_top_artist || "") !== artist) continue;
      const label = mode === "artist" ? r.pre_top_artist : r.pre_top_genre;
      const bandEn = bandE(r.pre_energy);
      if (!bandB || !bandEn) continue;
      const key = `${bandB}|${bandEn}`;
      if (!label || !bandEn) continue;
      const key = `${label}|${bandEn}`;
      const cell = grid.get(key) || { count: 0, mean_perf: 0, mean_mood: 0 };
      cell.count += 1;
      cell.mean_perf += Number.isFinite(r.tonnage_z) ? (r.tonnage_z as number) : 0;
      cell.mean_mood += Number.isFinite(r.mood_delta) ? (r.mood_delta as number) : 0;
      grid.set(key, cell);
    }

    const cells = [...grid.entries()].map(([k, v]) => {
      const [bpm, energy] = k.split("|");
      const [label, energy] = k.split("|");
      return {
        bpm,
        label,
        energy,
        count: v.count,
        perf: +(v.mean_perf / v.count).toFixed(2),
        mood: +(v.mean_mood / v.count).toFixed(2),
      };
    });

    return NextResponse.json({ days, cells });
    return NextResponse.json({ days, mode, cells });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 401 });
  }
} 
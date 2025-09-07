// app/api/insights/summary/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";
import { diffInMeans, mean, confidence, bpmBand, bucketHour } from "@/lib/stats";

type Row = {
  workout_id: string;
  started_at: string;
  split_name: string | null;
  tonnage_z: number | null;
  pre_bpm: number | null;
  pre_energy: number | null;
  pre_valence: number | null;
  pre_bpm_band: string | null;
  pre_top_genre: string | null;
  mood_delta: number | null;
};

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);
    const userId = user.id;

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");
    const split = searchParams.get("split"); // optional

    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("v_correlations_ready")
      .select(
        "workout_id, started_at, split_name, tonnage_z, pre_bpm, pre_energy, pre_valence, pre_bpm_band, pre_top_genre, mood_delta"
      )
      .eq("user_id", userId)
      .gte("started_at", since)
      .order("started_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let rows = (data || []) as Row[];
    if (split) rows = rows.filter((r) => (r.split_name || "") === split);

  // --- Music→Performance (energy high vs baseline)
  const hi = rows.filter((r) => (r.pre_energy ?? 0) >= 0.7).map((r) => r.tonnage_z ?? NaN);
  const lo = rows.filter((r) => (r.pre_energy ?? 0) < 0.7).map((r) => r.tonnage_z ?? NaN);
  const effectPerf = diffInMeans(hi, lo);
  const perfN = hi.filter(Number.isFinite).length + lo.filter(Number.isFinite).length;

  // --- Music→Mood (valence high vs baseline)
  const vhi = rows.filter((r) => (r.pre_valence ?? 0) >= 0.6).map((r) => r.mood_delta ?? NaN);
  const vlo = rows.filter((r) => (r.pre_valence ?? 0) < 0.6).map((r) => r.mood_delta ?? NaN);
  const effectMood = diffInMeans(vhi, vlo);
  const moodN = vhi.filter(Number.isFinite).length + vlo.filter(Number.isFinite).length;

  // --- BPM band ranking
  const byBand = new Map<string, number[]>();
  for (const r of rows) {
    const b = r.pre_bpm != null ? bpmBand(r.pre_bpm) : r.pre_bpm_band;
    if (!b) continue;
    const arr = byBand.get(b) || [];
    if (Number.isFinite(r.tonnage_z)) arr.push(r.tonnage_z as number);
    byBand.set(b, arr);
  }
  const bandStats = [...byBand.entries()].map(([band, zs]) => ({
    band,
    uplift: mean(zs),
    n: zs.length,
  }));
  bandStats.sort((a, b) => (b.uplift || -9) - (a.uplift || -9));
  const bestBand = bandStats[0] || null;

  // --- Time of day
  const byHour = new Map<string, number[]>();
  for (const r of rows) {
    const key = bucketHour(r.started_at);
    const arr = byHour.get(key) || [];
    if (Number.isFinite(r.tonnage_z)) arr.push(r.tonnage_z as number);
    byHour.set(key, arr);
  }
  const timeStats = [...byHour.entries()].map(([bucket, zs]) => ({ bucket, uplift: mean(zs), n: zs.length }));
  timeStats.sort((a, b) => (b.uplift || -9) - (a.uplift || -9));
  const bestTime = timeStats[0] || null;

  // --- Genres
  const byGenre = new Map<string, { perf: number[]; mood: number[] }>();
  for (const r of rows) {
    const g = r.pre_top_genre || null;
    if (!g) continue;
    const entry = byGenre.get(g) || { perf: [], mood: [] };
    if (Number.isFinite(r.tonnage_z)) entry.perf.push(r.tonnage_z as number);
    if (Number.isFinite(r.mood_delta)) entry.mood.push(r.mood_delta as number);
    byGenre.set(g, entry);
  }
  const genreCards = [...byGenre.entries()]
    .map(([g, v]) => ({
      genre: g,
      perf: mean(v.perf),
      mood: mean(v.mood),
      n: Math.max(v.perf.length, v.mood.length),
    }))
    .filter((g) => g.n >= 5)
    .sort((a, b) => (b.perf || -9) - (a.perf || -9))
    .slice(0, 6);

  const res = {
    filters: { days, split: split || null, sample: rows.length },
    cards: {
      music_to_performance: {
        headline: `High-energy (≥0.7) pre-workout vs baseline`,
        uplift: Number.isFinite(effectPerf) ? Number(effectPerf.toFixed(2)) : null,
        n: perfN,
        confidence: confidence(perfN, Math.abs(effectPerf || 0)),
      },
      music_to_mood: {
        headline: `High-valence (≥0.6) pre vs baseline`,
        uplift: Number.isFinite(effectMood) ? Number(effectMood.toFixed(2)) : null,
        n: moodN,
        confidence: confidence(moodN, Math.abs(effectMood || 0)),
      },
      best_bpm_band: bestBand,
      best_time_of_day: bestTime,
      top_genres: genreCards,
    },
  };

    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 401 });
  }
}

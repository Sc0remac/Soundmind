// app/api/insights/summary/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient, fetchJoinedRows, energyBucket } from "../_common";
import { diffInMeans, mean, confidence, bucketHour } from "@/lib/stats";

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
    const sample = rows.length;

    // --- Music → Performance (energy high vs low)
    const highs = rows
      .filter((r) => energyBucket(r.pre_energy) === "high" && Number.isFinite(r.tonnage_z as any))
      .map((r) => Number(r.tonnage_z));
    const lows = rows
      .filter((r) => energyBucket(r.pre_energy) === "low" && Number.isFinite(r.tonnage_z as any))
      .map((r) => Number(r.tonnage_z));
    const perfUplift = highs.length && lows.length ? diffInMeans(highs, lows) : null;
    const perfHeadline =
      perfUplift == null
        ? "Not enough data yet"
        : perfUplift >= 0
        ? "High-energy music ↗︎ average performance"
        : "High-energy music ↘︎ average performance";
    const perfConf = confidence(Math.min(highs.length, lows.length), Math.abs(perfUplift ?? 0));

    // --- Music → Mood (post-pre mood delta)
    const moodHighs = rows
      .filter((r) => energyBucket(r.pre_energy) === "high" && Number.isFinite(r.mood_delta as any))
      .map((r) => Number(r.mood_delta));
    const moodLows = rows
      .filter((r) => energyBucket(r.pre_energy) === "low" && Number.isFinite(r.mood_delta as any))
      .map((r) => Number(r.mood_delta));
    const moodUplift = moodHighs.length && moodLows.length ? diffInMeans(moodHighs, moodLows) : null;
    const moodHeadline =
      moodUplift == null
        ? "Not enough data yet"
        : moodUplift >= 0
        ? "High-energy music linked to ↑ mood post-workout"
        : "High-energy music linked to ↓ mood post-workout";
    const moodConf = confidence(Math.min(moodHighs.length, moodLows.length), Math.abs(moodUplift ?? 0));

    // --- Top artist for workouts (mean tonnage_z; n>=3)
    const byArtist = new Map<string, number[]>();
    rows.forEach((r) => {
      const a = (r.pre_top_artist || "").trim();
      if (!a) return;
      if (!byArtist.has(a)) byArtist.set(a, []);
      if (Number.isFinite(r.tonnage_z as any)) byArtist.get(a)!.push(Number(r.tonnage_z));
    });
    const topArtist =
      [...byArtist.entries()]
        .map(([artist, arr]) => ({ artist, n: arr.length, perf: mean(arr) }))
        .filter((x) => x.n >= 3)
        .sort((a, b) => b.perf - a.perf)[0] || null;

    // --- Top genre for mood (mean mood_delta; n>=3)
    const byGenreMood = new Map<string, number[]>();
    rows.forEach((r) => {
      const g = (r.pre_top_genre || "").trim();
      if (!g) return;
      if (!byGenreMood.has(g)) byGenreMood.set(g, []);
      if (Number.isFinite(r.mood_delta as any)) byGenreMood.get(g)!.push(Number(r.mood_delta));
    });
    const topGenreMood =
      [...byGenreMood.entries()]
        .map(([genre, arr]) => ({ genre, n: arr.length, mood: mean(arr) }))
        .filter((x) => x.n >= 3)
        .sort((a, b) => b.mood - a.mood)[0] || null;

    // --- Best time of day (mean tonnage_z; n>=3)
    const byBucket = new Map<string, number[]>();
    rows.forEach((r) => {
      if (!r.started_at) return;
      const b = bucketHour(r.started_at);
      if (!byBucket.has(b)) byBucket.set(b, []);
      if (Number.isFinite(r.tonnage_z as any)) byBucket.get(b)!.push(Number(r.tonnage_z));
    });
    const bestBucket =
      [...byBucket.entries()]
        .map(([bucket, arr]) => ({ bucket, n: arr.length, perf: mean(arr) }))
        .filter((x) => x.n >= 3)
        .sort((a, b) => b.perf - a.perf)[0] || null;

    // --- Genre & artist leaderboards
    const byGenrePerf = new Map<string, { perf: number[]; mood: number[] }>();
    rows.forEach((r) => {
      const g = (r.pre_top_genre || "").trim();
      if (!g) return;
      if (!byGenrePerf.has(g)) byGenrePerf.set(g, { perf: [], mood: [] });
      if (Number.isFinite(r.tonnage_z as any)) byGenrePerf.get(g)!.perf.push(Number(r.tonnage_z));
      if (Number.isFinite(r.mood_delta as any)) byGenrePerf.get(g)!.mood.push(Number(r.mood_delta));
    });
    const top_genres = [...byGenrePerf.entries()]
      .map(([genre, { perf, mood }]) => ({
        genre,
        perf: +(mean(perf) || 0).toFixed(2),
        mood: +(mean(mood) || 0).toFixed(2),
        n: Math.max(perf.length, mood.length),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 20);

    const byArtistPerf = new Map<string, { perf: number[]; mood: number[] }>();
    rows.forEach((r) => {
      const a = (r.pre_top_artist || "").trim();
      if (!a) return;
      if (!byArtistPerf.has(a)) byArtistPerf.set(a, { perf: [], mood: [] });
      if (Number.isFinite(r.tonnage_z as any)) byArtistPerf.get(a)!.perf.push(Number(r.tonnage_z));
      if (Number.isFinite(r.mood_delta as any)) byArtistPerf.get(a)!.mood.push(Number(r.mood_delta));
    });
    const top_artists = [...byArtistPerf.entries()]
      .map(([artist, { perf, mood }]) => ({
        artist,
        perf: +(mean(perf) || 0).toFixed(2),
        mood: +(mean(mood) || 0).toFixed(2),
        n: Math.max(perf.length, mood.length),
      }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 20);

    return NextResponse.json({
      filters: { days, split, genre, artist, sample },
      cards: {
        music_to_performance: {
          headline: perfHeadline,
          uplift: perfUplift == null ? null : +perfUplift.toFixed(2),
          n: Math.min(highs.length, lows.length),
          confidence: perfConf,
        },
        music_to_mood: {
          headline: moodHeadline,
          uplift: moodUplift == null ? null : +moodUplift.toFixed(2),
          n: Math.min(moodHighs.length, moodLows.length),
          confidence: moodConf,
        },
        top_artist_performance: topArtist
          ? { artist: topArtist.artist, uplift: +topArtist.perf.toFixed(2), n: topArtist.n }
          : null,
        top_genre_mood: topGenreMood
          ? { genre: topGenreMood.genre, uplift: +topGenreMood.mood.toFixed(2), n: topGenreMood.n }
          : null,
        best_time_of_day: bestBucket
          ? { bucket: bestBucket.bucket, uplift: +bestBucket.perf.toFixed(2), n: bestBucket.n }
          : null,
        top_genres,
        top_artists,
      },
    });
  } catch (e: any) {
    const status = e?.status || 500;
    console.error("[/api/insights/summary] error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

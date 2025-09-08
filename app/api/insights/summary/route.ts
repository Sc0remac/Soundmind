// app/api/insights/summary/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient, fetchJoinedRows, energyBucket } from "../_common";
import { mean, sd, bucketHour } from "@/lib/stats";

type LabelImpact = { label: string; impact: number; n: number };
type BestTime = { window: string; n: number };

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

/** Map energy bucket to a suggested BPM range for copy */
function energyToBpmRange(e: "low" | "mid" | "high" | null) {
  if (e === "low") return [90, 110] as [number, number];
  if (e === "mid") return [110, 128] as [number, number];
  if (e === "high") return [128, 145] as [number, number];
  return null;
}

export async function GET(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");
    const split = searchParams.get("split");
    const genre = searchParams.get("genre");
    const artist = searchParams.get("artist");
    const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

    // Pull sessions with performance + pre-music (and mood if available)
    const rows = await fetchJoinedRows({ client, userId, sinceIso, split, genre, artist });

    // ---------- Combined score ----------
    // We want a single per-session number the UI can reason about:
    // score = 0.6 * tonnage_z  +  0.4 * mood_delta_z  (if mood present; else 0)
    // We compute mood_delta_z across the user's data in-range.
    const perfZ = rows.map((r) => (Number.isFinite(r.tonnage_z as any) ? Number(r.tonnage_z) : null));
    const moodDelta = rows.map((r) => (Number.isFinite(r.mood_delta as any) ? Number(r.mood_delta) : null));
    const moodPresent = moodDelta.filter((x) => x != null) as number[];
    const moodMean = moodPresent.length >= 2 ? mean(moodPresent) : 0;
    const moodSd = moodPresent.length >= 2 ? sd(moodPresent) : 1;

    const weights = { perf: 0.6, mood: 0.4 };
    const scores = rows.map((r, i) => {
      const p = perfZ[i] ?? 0;
      const m = moodDelta[i] != null && moodSd > 0 ? (moodDelta[i]! - moodMean) / moodSd : 0;
      return weights.perf * p + weights.mood * m;
    });

    const overallMean = scores.length ? mean(scores) : 0;

    // ---------- Impacts per label ----------
    const aggBy = <K extends string>(key: K) => {
      const map = new Map<string, number[]>();
      rows.forEach((r, i) => {
        const label = (r as any)[key] as string | null;
        if (!label) return;
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(scores[i] ?? 0);
      });
      const arr: LabelImpact[] = [...map.entries()].map(([label, arr]) => ({
        label,
        impact: +(mean(arr) - overallMean).toFixed(2),
        n: arr.length,
      }));
      arr.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || b.n - a.n);
      return arr;
    };

    const byGenre = aggBy("pre_top_genre");
    const byArtist = aggBy("pre_top_artist");

    const boosters_genres = byGenre.filter((x) => x.impact > 0).slice(0, 6);
    const boosters_artists = byArtist.filter((x) => x.impact > 0).slice(0, 6);
    const drainers_genres = byGenre.filter((x) => x.impact < 0).slice(0, 6);
    const drainers_artists = byArtist.filter((x) => x.impact < 0).slice(0, 6);

    // ---------- Best time window ----------
    const bucketMap = new Map<string, number[]>();
    rows.forEach((r, i) => {
      const bucket = bucketHour(r.started_at);
      if (!bucketMap.has(bucket)) bucketMap.set(bucket, []);
      bucketMap.get(bucket)!.push(scores[i] ?? 0);
    });

    const bestTime: BestTime | null =
      [...bucketMap.entries()]
        .map(([window, arr]) => ({ window, n: arr.length, score: mean(arr) }))
        .filter((x) => x.n >= 3)
        .sort((a, b) => b.score - a.score)[0] || null;

    // ---------- Best "recipe" (friendly suggestion) ----------
    // Prefer a high-energy genre if we have it; otherwise best overall label.
    const energyMeans = { low: [] as number[], mid: [] as number[], high: [] as number[] };
    rows.forEach((r, i) => {
      const eb = energyBucket(r.pre_energy);
      if (!eb) return;
      energyMeans[eb].push(scores[i] ?? 0);
    });
    const energyBest =
      (["high", "mid", "low"] as const)
        .map((k) => ({ key: k, n: energyMeans[k].length, score: mean(energyMeans[k]) }))
        .filter((x) => x.n >= 3)
        .sort((a, b) => b.score - a.score)[0] || null;

    const recipeSource =
      boosters_genres[0] ??
      boosters_artists[0] ??
      (byGenre[0] || byArtist[0]) /* fallback even if small n, front-end will gate */;

    const recipe = recipeSource
      ? {
          label: recipeSource.label,
          type: boosters_genres.includes(recipeSource as any) || byGenre.includes(recipeSource as any) ? "genre" : "artist",
          energy: (energyBest?.key as "low" | "mid" | "high" | undefined) ?? null,
          bpm: energyToBpmRange((energyBest?.key as any) ?? null),
          impact: recipeSource.impact,
          n: recipeSource.n,
        }
      : null;

    // ---------- Friendly score ----------
    const friendlyScore = clamp(+overallMean.toFixed(2), -1, 1); // keep it bounded for UX

    // ---------- Recommendation helpers ----------
    // Play URL: just provide a search link that works without extra scopes.
    const searchTerms = [
      ...(boosters_genres.slice(0, 2).map((x) => x.label) || []),
      ...(boosters_artists.slice(0, 2).map((x) => x.label) || []),
    ].join(" ");
    const play_url = searchTerms
      ? `https://open.spotify.com/search/${encodeURIComponent(searchTerms)}`
      : null;

    return NextResponse.json({
      filters: { days, split, genre, artist, sample: rows.length },
      headline: {
        score: friendlyScore,
        best_time: bestTime ? { window: bestTime.window, n: bestTime.n } : null,
        recipe: recipe,
        // short copy helpers the UI can render:
        copy: {
          line:
            recipe && bestTime
              ? `You train best with ${recipe.label}${recipe.energy ? ` (${recipe.energy})` : ""} around ${bestTime.window}.`
              : recipe
              ? `Your best bet right now is ${recipe.label}${recipe.energy ? ` (${recipe.energy})` : ""}.`
              : bestTime
              ? `Your most consistent time is ${bestTime.window}.`
              : null,
        },
      },
      boosters: { genres: boosters_genres, artists: boosters_artists },
      drainers: { genres: drainers_genres, artists: drainers_artists },
      recommendations: {
        play_url,
        notes: "Likely (n≥10), Tentative (n 5–9), Anecdotal (n<5)",
      },
    });
  } catch (e: any) {
    const status = e?.status || 500;
    console.error("[/api/insights/summary] error:", e);
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

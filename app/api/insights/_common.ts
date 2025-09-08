// app/api/insights/_common.ts
import { supabaseFromRequest } from "@/lib/auth";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";

/**
 * Auth + client helper
 */
export async function getUserAndClient(req: Request) {
  const { supa } = supabaseFromRequest(req);
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) {
    const err = new Error(error?.message || "Unauthorized");
    (err as any).status = 401;
    throw err;
  }
  const client = usingServiceRole ? supabaseAdmin : supa;
  return { client, userId: data.user.id };
}

export type PerfRow = {
  workout_id: string;
  user_id: string;
  started_at: string;
  split_name: string | null;
  tonnage: number | null;
  sets_count: number | null;
  tonnage_z: number | null;
};

export type JoinedRow = PerfRow & {
  pre_energy: number | null;
  pre_valence: number | null;
  pre_top_genre: string | null;
  pre_top_artist: string | null;
  mood_delta: number | null;
};

/**
 * Robustly fetch music-pre context for a set of workouts, tolerating schema drift.
 * We select('*') and then map to canonical fields with a series of fallbacks.
 */
function mapMusicPreRow(raw: any): {
  workout_id: string;
  pre_energy: number | null;
  pre_valence: number | null;
  pre_top_genre: string | null;
  pre_top_artist: string | null;
} {
  // Build a case-insensitive view of keys for convenience
  const lower: Record<string, any> = {};
  for (const k of Object.keys(raw || {})) lower[k.toLowerCase()] = raw[k];

  const pickNumber = (cands: string[]): number | null => {
    for (const c of cands) {
      const v = lower[c.toLowerCase()];
      if (typeof v === "number" && Number.isFinite(v)) return v;
      // sometimes numbers arrive as strings
      if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
    }
    return null;
  };

  const pickString = (cands: string[]): string | null => {
    for (const c of cands) {
      const v = lower[c.toLowerCase()];
      if (v == null) continue;
      if (typeof v === "string" && v.trim() !== "") return v.trim();
      // arrays like ['rock','alt']
      if (Array.isArray(v) && v.length) return String(v[0]);
      // JSON object with {name:"..."}
      if (typeof v === "object" && v.name) return String(v.name);
    }
    return null;
  };

  const mapBucketStr = (s?: string | null): number | null => {
    if (!s) return null;
    const x = s.toLowerCase();
    if (x.startsWith("low")) return 0.2;
    if (x.startsWith("mid")) return 0.5;
    if (x.startsWith("high")) return 0.8;
    return null;
  };

  // 1) ENERGY
  let pre_energy =
    pickNumber(["pre_energy", "energy", "avg_energy", "energy_mean", "energy_score", "energy_norm", "energy_index"]) ??
    mapBucketStr(pickString(["energy_bucket", "pre_energy_bucket"]));

  // Fallback: derive from BPM/tempo if present (normalize 60–200 bpm → 0..1)
  if (pre_energy == null) {
    const bpm =
      pickNumber(["pre_bpm", "bpm", "avg_bpm", "tempo", "avg_tempo", "deezer_bpm", "spotify_bpm"]) ?? null;
    if (bpm != null) {
      const clamped = Math.min(200, Math.max(60, bpm));
      pre_energy = (clamped - 60) / (200 - 60); // 0..1
    }
  }

  // 2) VALENCE / POSITIVITY
  const pre_valence =
    pickNumber(["pre_valence", "valence", "avg_valence", "valence_mean", "positivity", "happiness"]) ??
    (mapBucketStr(pickString(["valence_bucket", "mood_bucket"])) ?? null);

  // 3) GENRE / ARTIST
  const pre_top_genre =
    pickString(["pre_top_genre", "top_genre", "genre_primary", "primary_genre", "genre", "dominant_genre"]) ?? null;

  const pre_top_artist =
    pickString(["pre_top_artist", "top_artist", "artist", "artist_name", "dominant_artist"]) ?? null;

  return {
    workout_id: String(lower["workout_id"] ?? raw.workout_id),
    pre_energy: pre_energy ?? null,
    pre_valence: pre_valence ?? null,
    pre_top_genre,
    pre_top_artist,
  };
}

/**
 * Fetches performance rows and joins to music-pre (and optional mood-delta) in JS.
 * No hard dependency on a specific column set inside mv_sessions_music_pre.
 */
export async function fetchJoinedRows(opts: {
  client: any;
  userId: string;
  sinceIso: string;
  split?: string | null;
  genre?: string | null;
  artist?: string | null;
}): Promise<JoinedRow[]> {
  const { client, userId, sinceIso, split, genre, artist } = opts;

  // --- Performance
  let perfQ = client
    .from("mv_sessions_performance")
    .select("workout_id,user_id,started_at,split_name,tonnage,sets_count,tonnage_z")
    .eq("user_id", userId)
    .gte("started_at", sinceIso)
    .order("started_at", { ascending: false });

  if (split) perfQ = perfQ.eq("split_name", split);

  const { data: perfData, error: perfErr } = await perfQ;
  if (perfErr) {
    const err = new Error(`[perf] ${perfErr.message}`);
    (err as any).status = 500;
    throw err;
  }
  const perfRows = (perfData || []) as PerfRow[];
  if (!perfRows.length) return [];

  const workoutIds = perfRows.map((p) => p.workout_id);

  // --- Music pre: select('*') to avoid column-name breakage
  const { data: musicData, error: musicErr } = await client
    .from("mv_sessions_music_pre")
    .select("*")
    .in("workout_id", workoutIds);

  if (musicErr) {
    const err = new Error(`[music_pre] ${musicErr.message}`);
    (err as any).status = 500;
    throw err;
  }

  const musicByWorkout = new Map<string, ReturnType<typeof mapMusicPreRow>>();
  (musicData || []).forEach((row: any) => {
    const mapped = mapMusicPreRow(row);
    if (mapped?.workout_id) musicByWorkout.set(mapped.workout_id, mapped);
  });

  // --- Optional mood delta
  const moodDeltaByWorkout = new Map<string, number | null>();
  try {
    const { data: moodData } = await client
      .from("mv_sessions_mood_delta") // expected: workout_id, mood_delta
      .select("workout_id,mood_delta")
      .in("workout_id", workoutIds);
    (moodData || []).forEach((r: any) => {
      const v =
        typeof r.mood_delta === "number"
          ? r.mood_delta
          : typeof r.mood_delta === "string" && !isNaN(Number(r.mood_delta))
          ? Number(r.mood_delta)
          : null;
      moodDeltaByWorkout.set(r.workout_id, v);
    });
  } catch {
    // ignore if the helper view doesn't exist
  }

  // --- Join + client-side filters for genre/artist (after mapping)
  let joined: JoinedRow[] = perfRows.map((p) => {
    const m = musicByWorkout.get(p.workout_id);
    return {
      ...p,
      pre_energy: m?.pre_energy ?? null,
      pre_valence: m?.pre_valence ?? null,
      pre_top_genre: m?.pre_top_genre ?? null,
      pre_top_artist: m?.pre_top_artist ?? null,
      mood_delta: moodDeltaByWorkout.get(p.workout_id) ?? null,
    };
  });

  if (genre) {
    const g = genre.toLowerCase();
    joined = joined.filter((r) => (r.pre_top_genre || "").toLowerCase() === g);
  }
  if (artist) {
    const a = artist.toLowerCase();
    joined = joined.filter((r) => (r.pre_top_artist || "").toLowerCase() === a);
  }

  return joined;
}

/** Shared energy bucketer for summary/soundmap */
export function energyBucket(v: number | null | undefined): "low" | "mid" | "high" | null {
  if (v == null || isNaN(v)) return null;
  if (v < 0.33) return "low";
  if (v < 0.66) return "mid";
  return "high";
}

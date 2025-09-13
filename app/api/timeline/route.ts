// app/api/timeline/route.ts
import { NextResponse } from "next/server";
import { requireUserFromRequest, supabaseFromRequest } from "@/lib/auth";

type DaySummary = {
  mood_avg: number | null;
  mood_count: number;
  workout_volume: number | null;
  workout_count: number;
  music_minutes: number | null;
  track_count: number;
};

type EntryWorkout = {
  type: "workout";
  id: string;
  at: string; // ISO
  name: string;
  split_name: string | null;
  volume: number | null;
};
type EntryMood = {
  type: "mood";
  id: string;
  at: string; // ISO
  score: number;
  post_workout: boolean;
  energy: number | null;
  stress: number | null;
  label: string | null; // derived from contexts[0]
};
type EntryMusic = {
  type: "music";
  id: string;
  at: string; // ISO
  track_id: string;
  track_name: string | null;
  artist_name: string | null;
  album_image_url: string | null;
  duration_ms: number | null;
};
type EntryBundle = {
  type: "bundle";
  id: string; // synthetic
  at: string; // ISO of first track
  during_workout: boolean;
  workout_id: string | null;
  count: number;
  minutes: number;
  time_window: string; // e.g. 09:09–09:45
  top_track: { name: string | null; artist: string | null } | null;
  thumbs: string[]; // up to 3 album images
  tracks: Array<Pick<EntryMusic, "id" | "at" | "track_id" | "track_name" | "artist_name" | "album_image_url" | "duration_ms">>;
};

type DayBlock = {
  date: string; // YYYY-MM-DD
  summary: DaySummary & { top_genre: string | null; entry_count: number };
  entries: Array<EntryWorkout | EntryMood | EntryMusic | EntryBundle>;
};

function parseDateRange(searchParams: URLSearchParams) {
  const todayOnly = searchParams.get("range") === "today";
  const days = Number(searchParams.get("days") || (todayOnly ? "1" : "30"));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (from && to) {
    const start = new Date(from);
    const end = new Date(to);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return {
        startIso: start.toISOString(),
        endIso: end.toISOString(),
      };
    }
  }

  const now = new Date();
  if (todayOnly) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  const start = new Date(Date.now() - days * 86400_000);
  return { startIso: start.toISOString(), endIso: now.toISOString() };
}

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);
    const { supa } = supabaseFromRequest(req);
    const { searchParams } = new URL(req.url);

    const { startIso, endIso } = parseDateRange(searchParams);
    const sort = (searchParams.get("sort") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const compact = searchParams.get("compact") === "1" || searchParams.get("density") === "compact";
    const typesParam = (searchParams.get("types") || "workout,mood,music").toLowerCase();
    const includeWorkout = typesParam.includes("workout");
    const includeMood = typesParam.includes("mood");
    const includeMusic = typesParam.includes("music");

    // Fetch raw rows
    const [wRes, mRes, lRes] = await Promise.all([
      includeWorkout
        ? supa
            .from("workouts")
            .select("id,started_at,name,split_name,volume")
            .eq("user_id", user.id)
            .gte("started_at", startIso)
            .lte("started_at", endIso)
            .order("started_at", { ascending: sort === "asc" })
        : (Promise.resolve({ data: [], error: null }) as any),
      includeMood
        ? supa
            .from("moods")
            .select("id,created_at,score,post_workout,energy,stress,contexts")
            .eq("user_id", user.id)
            .gte("created_at", startIso)
            .lte("created_at", endIso)
            .order("created_at", { ascending: sort === "asc" })
        : (Promise.resolve({ data: [], error: null }) as any),
      includeMusic
        ? supa
            .from("v_spotify_listens_expanded")
            .select("id,user_id,played_at,track_id,track_name,artist_name,album_image_url,genre")
            .eq("user_id", user.id)
            .gte("played_at", startIso)
            .lte("played_at", endIso)
            .order("played_at", { ascending: sort === "asc" })
        : (Promise.resolve({ data: [], error: null }) as any),
    ]);

    if (wRes.error) throw new Error(wRes.error.message);
    if (mRes.error) throw new Error(mRes.error.message);
    if (lRes.error) throw new Error(lRes.error.message);

    const workouts = ((wRes.data as any[]) || []).map((w) => ({
      type: "workout",
      id: String(w.id),
      at: String(w.started_at),
      name: String(w.name ?? "Workout"),
      split_name: w.split_name ?? null,
      volume: typeof w.volume === "number" ? (w.volume as number) : w.volume != null ? Number(w.volume) : null,
    })) as EntryWorkout[];

    const moods = ((mRes.data as any[]) || []).map((r) => ({
      type: "mood",
      id: String(r.id),
      at: String(r.created_at),
      score: typeof r.score === "number" ? r.score : Number(r.score),
      post_workout: Boolean(r.post_workout),
      energy: typeof r.energy === "number" ? r.energy : r.energy != null ? Number(r.energy) : null,
      stress: typeof r.stress === "number" ? r.stress : r.stress != null ? Number(r.stress) : null,
      label: Array.isArray(r.contexts) && r.contexts.length ? String(r.contexts[0]) : null,
    })) as EntryMood[];

    const listensRaw = ((lRes.data as any[]) || []).map((r) => ({
      id: String(r.id),
      at: String(r.played_at),
      track_id: String(r.track_id),
      track_name: r.track_name != null ? String(r.track_name) : null,
      artist_name: r.artist_name != null ? String(r.artist_name) : null,
      album_image_url: r.album_image_url != null ? String(r.album_image_url) : null,
      genre: r.genre != null ? String(r.genre) : null,
    }));

    // Fetch durations for tracks used in listens
    const trackIds = Array.from(new Set(listensRaw.map((x) => x.track_id)));
    let durationByTrack = new Map<string, number | null>();
    if (trackIds.length) {
      const { data: tRows, error: tErr } = await supa
        .from("spotify_tracks")
        .select("id,duration_ms")
        .in("id", trackIds);
      if (tErr) throw new Error(tErr.message);
      (tRows || []).forEach((t: any) => {
        const d = typeof t.duration_ms === "number" ? t.duration_ms : t.duration_ms != null ? Number(t.duration_ms) : null;
        durationByTrack.set(String(t.id), d);
      });
    }

    const listens: (EntryMusic & { genre: string | null })[] = listensRaw.map((r) => ({
      type: "music",
      id: r.id,
      at: r.at,
      track_id: r.track_id,
      track_name: r.track_name,
      artist_name: r.artist_name,
      album_image_url: r.album_image_url,
      duration_ms: durationByTrack.get(r.track_id) ?? null,
      genre: r.genre ?? null,
    }));

    // Build day groups and summaries
    const allEntries = ([] as Array<EntryWorkout | EntryMood | EntryMusic>)
      .concat(workouts as any)
      .concat(moods as any)
      .concat(listens as any);

    allEntries.sort((a, b) => (a.at < b.at ? (sort === "asc" ? -1 : 1) : a.at > b.at ? (sort === "asc" ? 1 : -1) : 0));

    const groupMap = new Map<string, Array<EntryWorkout | EntryMood | EntryMusic>>();
    for (const e of allEntries) {
      const d = new Date(e.at);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      const arr = groupMap.get(key) || [];
      arr.push(e);
      groupMap.set(key, arr);
    }

    const days: DayBlock[] = [];
    for (const [date, items] of groupMap.entries()) {
      // split by type for bundling and summary
      const dayWorkouts = items.filter((x): x is EntryWorkout => x.type === "workout");
      const dayMoods = items.filter((x): x is EntryMood => x.type === "mood");
      const dayTracks = items.filter((x): x is EntryMusic & { genre?: string | null } => x.type === "music") as (EntryMusic & { genre?: string | null })[];

      // summaries
      const moodN = dayMoods.length;
      const moodSum = dayMoods.reduce((a, m) => a + (typeof m.score === "number" ? m.score : 0), 0);
      const volN = dayWorkouts.length;
      const volSum = dayWorkouts.reduce((a, w) => a + (typeof w.volume === "number" ? w.volume : 0), 0);
      const trackN = dayTracks.length;
      const musicMs = dayTracks.reduce((a, t) => a + (typeof t.duration_ms === "number" ? t.duration_ms : 0), 0);
      const genreMap = new Map<string, number>();
      for (const t of dayTracks) {
        const g = (t as any).genre as string | null;
        if (g) genreMap.set(g, (genreMap.get(g) || 0) + 1);
      }
      const top_genre = [...genreMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      // server-side bundling
      const windows = dayWorkouts.map((w) => ({ id: w.id, start: new Date(w.at).getTime(), end: new Date(w.at).getTime() + 2 * 3600_000 }));
      const sortedTracks = [...dayTracks].sort((a, b) => (a.at < b.at ? -1 : 1));
      const bundles: EntryBundle[] = [];
      const singles: EntryMusic[] = [];
      const maxGap = 15 * 60 * 1000;
      const maxSpan = 90 * 60 * 1000;
      const threshold = compact ? 1 : 3; // compact always bundle

      let curr: (EntryMusic & { during_workout?: string | null })[] = [];
      const isDuring = (ts: number) => windows.find((w) => ts >= w.start && ts <= w.end)?.id || null;
      for (const t of sortedTracks) {
        const tMs = new Date(t.at).getTime();
        (t as any).during_workout = isDuring(tMs);
        if (!curr.length) {
          curr.push(t as any);
          continue;
        }
        const prev = curr[curr.length - 1];
        const gap = tMs - new Date(prev.at).getTime();
        const span = tMs - new Date(curr[0].at).getTime();
        const overlapWorkout = (t as any).during_workout || (prev as any).during_workout;
        if ((gap <= maxGap && span <= maxSpan) || overlapWorkout) {
          curr.push(t as any);
        } else {
          if (curr.length >= threshold || (curr.some((x) => x.during_workout))) {
            const b = toBundle(curr);
            bundles.push(b);
          } else {
            singles.push(...(curr as EntryMusic[]));
          }
          curr = [t as any];
        }
      }
      if (curr.length) {
        if (curr.length >= threshold || curr.some((x) => x.during_workout)) bundles.push(toBundle(curr));
        else singles.push(...(curr as EntryMusic[]));
      }

      function toBundle(list: (EntryMusic & { during_workout?: string | null })[]): EntryBundle {
        const count = list.length;
        const minutes = Math.round(list.reduce((a, x) => a + (typeof x.duration_ms === "number" ? x.duration_ms : 0), 0) / 60000);
        const start = new Date(list[0].at);
        const end = new Date(list[list.length - 1].at);
        const pad = (n: number) => String(n).padStart(2, "0");
        const fmt = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        const time_window = `${fmt(start)}–${fmt(end)}`;
        const top_track = { name: list[0].track_name ?? null, artist: list[0].artist_name ?? null };
        const thumbs = Array.from(new Set(list.map((x) => x.album_image_url).filter(Boolean))).slice(0, 3) as string[];
        const duringId = list.find((x) => x.during_workout)?.during_workout ?? null;
        return {
          type: "bundle",
          id: `b-${date}-${list[0].id}`,
          at: list[0].at,
          during_workout: !!duringId,
          workout_id: duringId,
          count,
          minutes,
          time_window,
          top_track,
          thumbs,
          tracks: list.map((t) => ({
            id: t.id,
            at: t.at,
            track_id: t.track_id,
            track_name: t.track_name,
            artist_name: t.artist_name,
            album_image_url: t.album_image_url,
            duration_ms: t.duration_ms,
          })),
        };
      }

      const summary: DayBlock["summary"] = {
        mood_avg: moodN ? Number((moodSum / moodN).toFixed(2)) : null,
        mood_count: moodN,
        workout_volume: volN ? Math.round(volSum) : null,
        workout_count: volN,
        music_minutes: musicMs ? Math.round(musicMs / 60000) : null,
        track_count: trackN,
        top_genre,
        entry_count: items.length,
      };

      // Compose final entries: workouts + moods + bundles + singles
      const composed: Array<EntryWorkout | EntryMood | EntryMusic | EntryBundle> = [];
      composed.push(...dayWorkouts, ...dayMoods, ...bundles, ...singles);
      composed.sort((a, b) => (a.at < b.at ? (sort === "asc" ? -1 : 1) : a.at > b.at ? (sort === "asc" ? 1 : -1) : 0));

      days.push({ date, summary, entries: composed });
    }

    // Order days by date
    days.sort((a, b) => (a.date < b.date ? (sort === "asc" ? -1 : 1) : a.date > b.date ? (sort === "asc" ? 1 : -1) : 0));

    return NextResponse.json({ days });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

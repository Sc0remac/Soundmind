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

type DayBlock = {
  date: string; // YYYY-MM-DD
  summary: DaySummary;
  entries: Array<EntryWorkout | EntryMood | EntryMusic>;
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
            .select("id,user_id,played_at,track_id,track_name,artist_name,album_image_url")
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

    const listens: EntryMusic[] = listensRaw.map((r) => ({
      type: "music",
      id: r.id,
      at: r.at,
      track_id: r.track_id,
      track_name: r.track_name,
      artist_name: r.artist_name,
      album_image_url: r.album_image_url,
      duration_ms: durationByTrack.get(r.track_id) ?? null,
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
      let moodSum = 0;
      let moodN = 0;
      let volSum = 0;
      let volN = 0;
      let musicMs = 0;
      let trackN = 0;

      for (const it of items) {
        if (it.type === "mood") {
          if (typeof it.score === "number" && !isNaN(it.score)) {
            moodSum += it.score;
            moodN += 1;
          }
        } else if (it.type === "workout") {
          if (typeof it.volume === "number" && !isNaN(it.volume)) {
            volSum += it.volume;
            volN += 1;
          }
        } else if (it.type === "music") {
          trackN += 1;
          if (typeof it.duration_ms === "number" && !isNaN(it.duration_ms)) musicMs += it.duration_ms;
        }
      }

      const summary: DaySummary = {
        mood_avg: moodN ? Number((moodSum / moodN).toFixed(2)) : null,
        mood_count: moodN,
        workout_volume: volN ? Math.round(volSum) : null,
        workout_count: volN,
        music_minutes: musicMs ? Math.round(musicMs / 60000) : null,
        track_count: trackN,
      };

      // sort items within day by time according to sort
      items.sort((a, b) => (a.at < b.at ? (sort === "asc" ? -1 : 1) : a.at > b.at ? (sort === "asc" ? 1 : -1) : 0));

      days.push({ date, summary, entries: items });
    }

    // Order days by date
    days.sort((a, b) => (a.date < b.date ? (sort === "asc" ? -1 : 1) : a.date > b.date ? (sort === "asc" ? 1 : -1) : 0));

    return NextResponse.json({ days });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

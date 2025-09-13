// app/api/insights/facelift/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/app/api/insights/_common";
import { bucketHour, mean } from "@/lib/stats";

type Effect = "Big boost" | "Helps" | "Neutral" | "Drains";
type Reliability = "Consistent" | "Often" | "Early hint";

function mapEffect(impact: number): Effect {
  if (impact >= 0.6) return "Big boost";
  if (impact >= 0.2) return "Helps";
  if (impact <= -0.4) return "Drains";
  return "Neutral";
}

function mapReliability(n: number): Reliability {
  if (n >= 10) return "Consistent";
  if (n >= 5) return "Often";
  return "Early hint";
}

function formatEvidenceLine(d: Date, split: string | null, genre: string | null, better: boolean) {
  const wkd = d.toLocaleDateString(undefined, { weekday: "short" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const workout = split || "Workout";
  const g = genre || "Music";
  return `${wkd} ${hh}:${mm} ${workout} + ${g} — you felt ${better ? "better" : "worse"} after.`;
}

export async function GET(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);
    const now = new Date();
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 86400_000).toISOString();

    // Profile (music connection)
    const { data: prof } = await client
      .from("profiles")
      .select("spotify_connected, show_advanced")
      .eq("id", userId)
      .maybeSingle();
    const musicConnected = !!prof?.spotify_connected;

    // Fetch recent sessions + mood delta + pre music (last 30 days)
    const { data: perf, error: perfErr } = await client
      .from("mv_sessions_performance")
      .select("workout_id,user_id,started_at,split_name,tonnage_z")
      .eq("user_id", userId)
      .gte("started_at", thirtyDaysAgoIso)
      .order("started_at", { ascending: false });
    if (perfErr) throw perfErr;
    const workoutIds = (perf || []).map((r) => r.workout_id);

    const { data: moodRows } = await client
      .from("mv_sessions_mood_delta")
      .select("workout_id,mood_delta")
      .in("workout_id", workoutIds);
    const moodByWorkout = new Map<string, number | null>();
    (moodRows || []).forEach((r: any) => {
      const v = typeof r.mood_delta === "number" ? r.mood_delta : r.mood_delta != null ? Number(r.mood_delta) : null;
      moodByWorkout.set(String(r.workout_id), v);
    });

    const { data: preMusic } = await client
      .from("mv_sessions_music_pre")
      .select("workout_id,top_genre,avg_energy,avg_valence")
      .in("workout_id", workoutIds);
    const musicByWorkout = new Map<string, { top_genre: string | null; energy: number | null; valence: number | null }>();
    (preMusic || []).forEach((r: any) => {
      musicByWorkout.set(String(r.workout_id), {
        top_genre: r.top_genre ?? null,
        energy: typeof r.avg_energy === "number" ? r.avg_energy : r.avg_energy != null ? Number(r.avg_energy) : null,
        valence: typeof r.avg_valence === "number" ? r.avg_valence : r.avg_valence != null ? Number(r.avg_valence) : null,
      });
    });

    // Build per-session score used for impacts
    const sessions = (perf || []).map((p) => {
      const mood_delta = moodByWorkout.get(p.workout_id) ?? null;
      const m = musicByWorkout.get(p.workout_id) ?? { top_genre: null, energy: null, valence: null };
      const perf_z = typeof p.tonnage_z === "number" ? p.tonnage_z : p.tonnage_z != null ? Number(p.tonnage_z) : 0;
      const mood_z = mood_delta != null ? mood_delta : 0;
      const score = 0.6 * (perf_z || 0) + 0.4 * (mood_z || 0);
      return {
        workout_id: String(p.workout_id),
        started_at: String(p.started_at),
        split_name: p.split_name as string | null,
        perf_z: perf_z || 0,
        mood_delta: mood_delta,
        top_genre: m.top_genre,
        score,
      };
    });

    const sample = sessions.length;
    const anyThisWeek = sessions.some((s) => new Date(s.started_at).getTime() >= Date.now() - 7 * 86400_000);

    // Tone line
    let toneLine: string = "This week felt steady.";
    {
      const last7 = sessions.filter((s) => new Date(s.started_at).getTime() >= Date.now() - 7 * 86400_000).map((s) => s.mood_delta).filter((x) => x != null) as number[];
      const prev7 = sessions.filter((s) => new Date(s.started_at).getTime() < Date.now() - 7 * 86400_000 && new Date(s.started_at).getTime() >= Date.now() - 14 * 86400_000).map((s) => s.mood_delta).filter((x) => x != null) as number[];
      const lastMean = last7.length ? mean(last7) : 0;
      const prevMean = prev7.length ? mean(prev7) : 0;
      const delta = lastMean - prevMean;
      if (last7.length >= 3) {
        if (delta > 0.15) toneLine = "You felt better than usual.";
        else if (delta < -0.15) toneLine = "Energy dipped this week.";
        else toneLine = "This week felt steady.";
      } else if (!anyThisWeek) {
        toneLine = "No new sessions this week.";
      }
    }

    // Actionable pattern line candidates
    const evening = sessions.filter((s) => {
      const h = new Date(s.started_at).getHours();
      return h >= 17 && h <= 21;
    });
    const eveningPush = evening.filter((s) => (s.split_name || "").toLowerCase().includes("push"));
    const hiphopEveningPush = eveningPush.filter((s) => (s.top_genre || "").toLowerCase().includes("hip"));
    let patternLine = hiphopEveningPush.length >= 2
      ? "Evening Push with Hip-Hop usually lifts you."
      : evening.length >= 3
      ? "Light mornings work better than heavy sessions."
      : "Short cardio beats long steady work.";

    // Boosters/Drainers: compile candidates across genres, split_names, time buckets
    function aggImpact(key: (s: typeof sessions[number]) => string | null) {
      const map = new Map<string, number[]>();
      sessions.forEach((s) => {
        const k = key(s);
        if (!k) return;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(s.score);
      });
      const overall = sessions.map((s) => s.score);
      const overallMean = overall.length ? mean(overall) : 0;
      const arr = [...map.entries()].map(([label, vals]) => ({
        label,
        impact: +(mean(vals) - overallMean).toFixed(2),
        n: vals.length,
      }));
      arr.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact) || b.n - a.n);
      return arr;
    }

    const byGenre = aggImpact((s) => s.top_genre);
    const byWorkout = aggImpact((s) => s.split_name);
    const byTime = aggImpact((s) => bucketHour(s.started_at));

    // Map to chips with diversification and guardrails
    function mapChip(kind: "music" | "workout" | "time" | "drainer", label: string, impact: number, n: number) {
      const effect = mapEffect(impact);
      const reliability = mapReliability(n);
      const primary = kind === "music" ? "Play" : kind === "workout" ? "Add to plan" : kind === "time" ? "Schedule" : "Adjust";
      return { id: `${kind}:${label}`, kind, label, effect, reliability, primary };
    }

    // Build evidence lines per label
    const evidenceMap = new Map<string, string[]>();
    function addEvidence(key: string, line: string) {
      const arr = evidenceMap.get(key) || [];
      if (arr.length < 5) arr.push(line);
      evidenceMap.set(key, arr);
    }
    sessions.forEach((s) => {
      const d = new Date(s.started_at);
      const better = (s.mood_delta ?? 0) > 0;
      const line = formatEvidenceLine(d, s.split_name, s.top_genre, better);
      if (s.top_genre) addEvidence(`music:${s.top_genre}`, line);
      if (s.split_name) addEvidence(`workout:${s.split_name}`, line);
      addEvidence(`time:${bucketHour(s.started_at)}`, line);
    });

    // Diversify boosters: pick top across types
    const boosterPool = [
      ...byGenre.filter((x) => x.impact > 0).map((x) => ({ ...x, kind: "music" as const })),
      ...byWorkout.filter((x) => x.impact > 0).map((x) => ({ ...x, kind: "workout" as const })),
      ...byTime.filter((x) => x.impact > 0).map((x) => ({ ...x, kind: "time" as const })),
    ];
    const drainerPool = [
      ...byGenre.filter((x) => x.impact < 0).map((x) => ({ ...x, kind: "drainer" as const })),
      ...byWorkout.filter((x) => x.impact < 0).map((x) => ({ ...x, kind: "drainer" as const })),
      ...byTime.filter((x) => x.impact < 0).map((x) => ({ ...x, kind: "drainer" as const })),
    ];

    const boosters: any[] = [];
    const usedKinds = new Set<string>();
    for (const x of boosterPool) {
      if (boosters.length >= 3) break;
      if (usedKinds.has(x.kind)) continue;
      const chip = mapChip(x.kind, x.label, x.impact, x.n);
      chip["evidence"] = (evidenceMap.get(`${x.kind}:${x.label}`) || []).slice(0, 5);
      chip["recommendation"] = x.kind === "music" ? `Keep ${x.label} for Push after 18:00.` : x.kind === "workout" ? `Keep ${x.label} after 18:00.` : `Use ${x.label} evening slots.`;
      boosters.push(chip);
      usedKinds.add(x.kind);
    }

    const drainers: any[] = [];
    for (const x of drainerPool) {
      if (drainers.length >= 2) break;
      const chip = mapChip("drainer", x.label, x.impact, x.n);
      chip["evidence"] = (evidenceMap.get(`drainer:${x.label}`) || evidenceMap.get(`music:${x.label}`) || evidenceMap.get(`workout:${x.label}`) || evidenceMap.get(`time:${x.label}`) || []).slice(0, 5);
      chip["recommendation"] = x.label.toLowerCase().includes("morning") ? "Swap heavy mornings for a walk." : `Adjust ${x.label} to lighter work.`;
      drainers.push(chip);
    }

    // Best times (exactly two)
    const byBucket = new Map<string, number[]>();
    sessions.forEach((s) => {
      const b = bucketHour(s.started_at);
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b)!.push(s.score);
    });
    const bestSlots = [...byBucket.entries()]
      .map(([k, arr]) => ({ slot: k, score: mean(arr), n: arr.length }))
      .filter((x) => x.n >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.slot);

    // Pairings (exactly 3, static labels with effect inference)
    const pairings = [
      { id: "push-hiphop", label: "Push × Hip-Hop", effect: (byGenre.find((g) => /hip/i.test(g.label))?.impact ?? 0) > 0.4 ? "Big boost" : "Helps" },
      { id: "upper-pop", label: "Upper × Pop", effect: (byGenre.find((g) => /pop/i.test(g.label))?.impact ?? 0) > 0.2 ? "Helps" : "Neutral" },
      { id: "cardio-podcasts", label: "Cardio × Podcasts", effect: "Neutral" as Effect },
    ].map((p) => ({ ...p, cta: "Use this" }));

    // Weekly summary actions
    const playTerms = boosters.filter((b) => b.kind === "music").map((b) => b.label).slice(0, 2).join(" ") || "workout booster";
    const playUrl = `https://open.spotify.com/search/${encodeURIComponent(playTerms)}`;
    let summaryActions = [
      { id: "start_booster", label: musicConnected ? "Start booster playlist" : "Connect Spotify/Apple Music", primary: true, href: musicConnected ? playUrl : "/music" },
      { id: "add_evening_push", label: "Add two evening Push sessions", primary: false },
      { id: "open_plan", label: "Open plan", primary: false, target: "#plan" },
      { id: "see_why", label: "See why", primary: false },
    ];
    if (!anyThisWeek) {
      summaryActions = [
        { id: "plan_one", label: "Plan one session", primary: true, target: "#plan" },
        { id: "see_why", label: "See why", primary: false },
      ];
    }

    // Evidence for summary (3–5)
    const summaryEvidence = sessions
      .filter((s) => (s.mood_delta ?? 0) > 0)
      .slice(0, 5)
      .map((s) => formatEvidenceLine(new Date(s.started_at), s.split_name, s.top_genre, true));

    // Plan cards (up to 3)
    const plan = [
      {
        id: "plan1",
        title: "Tue 18:00 — Push + Booster Mix (45–60 min)",
        why: "Evening strength usually lifts your mood.",
        actions: ["Add to calendar", "Start playlist", "Auto-log template"],
      },
      {
        id: "plan2",
        title: "Thu 18:30 — Upper + Pop (40–50 min)",
        why: "Upbeat music supports evening strength.",
        actions: ["Add to calendar", "Start playlist", "Auto-log template"],
      },
      {
        id: "plan3",
        title: "Swap morning heavy sessions for a walk + light playlist",
        why: "Mornings often feel flat for you.",
        actions: ["Add to calendar", "Start playlist", "Auto-log template"],
      },
    ];

    // Small wins and tip
    const smallWins = [
      "Training with music beat no-music sessions.",
      "Shorter cardio worked better than long.",
    ];
    const tip = "Log mood within two hours after workouts.";

    // Empty/edge states
    const lowData = sample < 5;
    const newUser = sample < 2;
    const conflicting = false; // guardrail friendly; can be tightened later

    const summary = {
      line1: conflicting ? "Mixed results this week." : toneLine,
      line2: patternLine,
      actions: summaryActions,
      evidence: summaryEvidence,
    };

    const payload = {
      sample,
      states: {
        newUser,
        lowData,
        conflicting,
        stale: !anyThisWeek,
        musicConnected,
      },
      weeklySummary: summary,
      chips: {
        boosters,
        drainers,
      },
      best: {
        slots: bestSlots,
        pairings,
      },
      plan,
      wins: smallWins,
      tip,
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ error: e?.message || String(e) }, { status });
  }
}

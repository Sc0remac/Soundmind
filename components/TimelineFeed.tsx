"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type TimelineItem = {
  id: string;
  type: "mood" | "workout";
  created_at: string;
  data: any;
};

function toISODateKey(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}

function formatDateHeader(key: string) {
  // key is YYYY-MM-DD
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function cap(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isBlockShape(sets: any): boolean {
  // New structure: [{ exercise_id?, exercise_name?, sets: [{reps,weight}...] }, ...]
  return Array.isArray(sets) && sets.length > 0 && typeof sets[0] === "object" && "sets" in sets[0];
}

export default function TimelineFeed() {
  const [groups, setGroups] = useState<Record<string, TimelineItem[]>>({});
  const orderedDays = useMemo(
    () => Object.keys(groups).sort((a, b) => (a < b ? 1 : -1)), // newest day first
    [groups]
  );
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);

      const [wRes, mRes] = await Promise.all([
        supabase
          .from("workouts")
          .select("id, created_at, day, name, sets")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("moods")
          .select("id, created_at, score, journal, sentiment, post_workout")
          .order("created_at", { ascending: false })
          .limit(250),
      ]);

      if (wRes.error) setErr(wRes.error.message);
      if (mRes.error) setErr((e) => e ?? mRes.error!.message);

      const items: TimelineItem[] = [];
      (wRes.data ?? []).forEach((r: any) =>
        items.push({ id: r.id, type: "workout", created_at: r.created_at, data: r })
      );
      (mRes.data ?? []).forEach((r: any) =>
        items.push({ id: r.id, type: "mood", created_at: r.created_at, data: r })
      );

      items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      const grouped: Record<string, TimelineItem[]> = {};
      for (const it of items) {
        const key = toISODateKey(new Date(it.created_at));
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(it);
      }

      if (mounted) {
        setGroups(grouped);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading timeline…</p>;
  }
  if (err) {
    return <p className="text-sm text-red-600">Error: {err}</p>;
  }
  if (orderedDays.length === 0) {
    return <p className="text-sm text-gray-600">No entries yet. Log a workout or a mood to get started.</p>;
  }

  return (
    <div className="space-y-8">
      {orderedDays.map((dayKey) => (
        <section key={dayKey} className="space-y-4">
          <h2 className="text-lg font-semibold">{formatDateHeader(dayKey)}</h2>

          <div className="space-y-4">
            {groups[dayKey].map((item) =>
              item.type === "mood" ? (
                <MoodCard key={item.id} row={item.data} created_at={item.created_at} />
              ) : (
                <WorkoutCard key={item.id} row={item.data} created_at={item.created_at} />
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function MoodCard({ row, created_at }: { row: any; created_at: string }) {
  const label = cap(row?.sentiment?.label) || "—";
  const tagColor =
    row?.sentiment?.label === "positive"
      ? "bg-positive/10 text-positive border-positive/30"
      : row?.sentiment?.label === "negative"
      ? "bg-negative/10 text-negative border-negative/30"
      : "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Mood: {row.score ?? "—"}/10</h3>
          {row.journal ? (
            <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{row.journal}</p>
          ) : (
            <p className="mt-1 text-sm text-gray-500 italic">No journal entry.</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs border px-2 py-0.5 rounded-full ${tagColor}`}>
              Overall: {label}
            </span>
            <span className="text-xs text-gray-500">
              {row.post_workout ? "Post-workout" : "General"}
            </span>
          </div>
        </div>

        <time className="text-xs text-gray-500 shrink-0">{formatTime(created_at)}</time>
      </div>
    </article>
  );
}

function WorkoutCard({ row, created_at }: { row: any; created_at: string }) {
  const title = row?.day || row?.name || "Workout";

  // Normalize sets to a blocks array:
  // - New: [{ exercise_name, sets: [{reps,weight}...] }, ...]
  // - Legacy: [{reps,weight}, ...]  => wrap into one block with no name
  const blocks = isBlockShape(row?.sets)
    ? (row.sets as any[])
    : [{ exercise_id: null, exercise_name: "", sets: (row?.sets ?? []) as any[] }];

  return (
    <article className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Workout: {title}</h3>
          {/* Optional: subtle info row could go here */}
        </div>
        <time className="text-xs text-gray-500 shrink-0">{formatTime(created_at)}</time>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {blocks.map((blk: any, idx: number) => (
          <div key={idx} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {blk.exercise_name && blk.exercise_name.trim().length > 0
                  ? blk.exercise_name
                  : "Exercise"}
              </div>
              <div className="text-xs text-gray-500">
                {Array.isArray(blk.sets) ? `${blk.sets.length} set${blk.sets.length === 1 ? "" : "s"}` : ""}
              </div>
            </div>

            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1.5 pr-4 w-16">Set #</th>
                    <th className="py-1.5 pr-4 w-20">Reps</th>
                    <th className="py-1.5 pr-2 w-28">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {(blk.sets ?? []).map((s: any, j: number) => (
                    <tr key={j} className="border-b last:border-0">
                      <td className="py-1.5 pr-4">{j + 1}</td>
                      <td className="py-1.5 pr-4">{(s?.reps ?? s?.r ?? 0) || 0}</td>
                      <td className="py-1.5 pr-2">
                        {typeof s?.weight === "number" ? s.weight : s?.w ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

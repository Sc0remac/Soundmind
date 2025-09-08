"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// ---------- Types (from the new /summary) ----------
type LabelImpact = { label: string; impact: number; n: number };
type BestTime = { window: string; n: number };
type SummaryOut = {
  filters: { days: number; split: string | null; genre: string | null; artist: string | null; sample: number };
  headline: {
    score: number | null;
    best_time: BestTime | null;
    recipe: { label: string; type: "genre" | "artist"; energy: "low" | "mid" | "high" | null; bpm: [number, number] | null; impact: number; n: number } | null;
    copy: { line: string | null };
  };
  boosters: { genres: LabelImpact[]; artists: LabelImpact[] };
  drainers: { genres: LabelImpact[]; artists: LabelImpact[] };
  recommendations: { play_url: string | null; notes: string };
};

// ---------- Timeline (reuses your existing API) ----------
type ApiTimelineSession = {
  workout_id: string;
  started_at: string;
  split_name: string | null;
  tonnage: number | null;
  sets_count: number | null;
  tonnage_z: number | null;
  pre_top_genre: string | null;
  pre_top_artist: string | null;
  mood_delta: number | null;
};
type ApiTimelineItem = { date: string; sessions: ApiTimelineSession[] };
type UiSession = {
  id: string;
  split: string | null;
  time: string;
  tonnage: number | null;
  sets: number | null;
  pre: { artist: string | null; genre: string | null };
  z: number | null;
  mood_delta: number | null;
};
type UiTimelineItem = { date: string; sessions: UiSession[] };

function toUiTimeline(items: ApiTimelineItem[] | undefined | null): UiTimelineItem[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((d) => ({
    date: d.date,
    sessions: (d.sessions || []).map((s) => ({
      id: s.workout_id,
      split: s.split_name ?? null,
      time: s.started_at,
      tonnage: typeof s.tonnage === "number" ? s.tonnage : null,
      sets: typeof s.sets_count === "number" ? s.sets_count : null,
      pre: { artist: s.pre_top_artist ?? null, genre: s.pre_top_genre ?? null },
      z: typeof s.tonnage_z === "number" ? s.tonnage_z : null,
      mood_delta: typeof s.mood_delta === "number" ? s.mood_delta : null,
    })),
  }));
}

// ---------- Small helpers ----------
function fmtDelta(x?: number | null) {
  if (x == null || isNaN(x as any)) return "—";
  const sign = (x as number) > 0 ? "+" : "";
  return `${sign}${(x as number).toFixed(2)}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------- Bubble component (inline for simplicity) ----------
function BubbleRow({
  title,
  items,
  colorMode = "impact",
  emptyText,
  onPick,
}: {
  title: string;
  items: LabelImpact[];
  colorMode?: "impact";
  emptyText?: string;
  onPick?: (label: string) => void;
}) {
  const top = items.slice(0, 6);
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-2 font-medium">{title}</div>
      {top.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyText || "Not enough data yet."}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {top.map((x) => {
            const positive = x.impact >= 0;
            const intensity = Math.min(1, Math.abs(x.impact) / 1.0); // clamp around 1 SD
            const hue = positive ? 150 : 0; // green/red
            const bg = `hsl(${hue} 80% ${92 - 28 * intensity}%)`;
            const ring = `hsl(${hue} 60% ${70 - 10 * intensity}%)`;
            const size = Math.min(1, Math.max(0.35, x.n / 12)); // bubble size by n (cap)
            return (
              <button
                key={x.label}
                className="rounded-full px-3 py-2 border text-sm"
                style={{ background: bg, borderColor: ring, transform: `scale(${0.85 + 0.3 * size})` }}
                onClick={() => onPick?.(x.label)}
                title={`${x.label}: impact ${fmtDelta(x.impact)} · n=${x.n}`}
              >
                <span className="font-medium">{x.label}</span>{" "}
                <span className="text-gray-700">{fmtDelta(x.impact)}</span>
                <span className="text-gray-500"> · {x.n}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function InsightsPage() {
  const [days, setDays] = useState(30);
  const [split, setSplit] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryOut | null>(null);
  const [timeline, setTimeline] = useState<UiTimelineItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  const filtersQS = useMemo(() => {
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (split) p.set("split", split);
    return p.toString();
  }, [days, split]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [s, t] = await Promise.all([
        fetch(`/api/insights/summary?${filtersQS}`, { headers }).then((r) => r.json()),
        fetch(`/api/insights/timeline?${filtersQS}`, { headers }).then((r) => r.json()),
      ]);

      setSummary(s?.error ? null : (s as SummaryOut));
      setTimeline(t?.error ? [] : toUiTimeline(t?.items as ApiTimelineItem[]).slice(0, 5)); // short digest
      setLoading(false);
    })();
  }, [filtersQS]);

  // simple ICS generator for best-time schedule
  const icsHref = (() => {
    const bt = summary?.headline?.best_time;
    if (!bt) return null;
    // crude DTSTART: today at start of window's first hour (parse "17–20")
    const m = /^(\d{2})/.exec(bt.window);
    const hour = m ? Number(m[1]) : 17;
    const today = new Date();
    today.setHours(hour, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dt = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}T${pad(today.getHours())}0000`;
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Soundmind//Insights//EN",
      "BEGIN:VEVENT",
      `DTSTART:${dt}`,
      "RRULE:FREQ=WEEKLY",
      "SUMMARY:Train at your best time",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
  })();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select className="border rounded p-2" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select className="border rounded p-2" value={split ?? ""} onChange={(e) => setSplit(e.target.value || null)}>
            <option value="">All splits</option>
            <option>Push</option>
            <option>Pull</option>
            <option>Legs</option>
            <option>Upper</option>
            <option>Lower</option>
            <option>Arms</option>
            <option>Back</option>
            <option>Full Body</option>
          </select>
        </div>
      </div>

      {/* Hero strip */}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Last {summary?.filters?.days ?? days} days score</div>
            <div
              className="px-3 py-1 rounded-full text-sm"
              style={{
                background:
                  summary?.headline?.score != null
                    ? `hsl(${(summary.headline.score ?? 0) >= 0 ? 150 : 0} 80% ${92 - 20 * Math.min(1, Math.abs(summary.headline.score ?? 0))}%)`
                    : "var(--gray-50, #f9fafb)",
              }}
            >
              {fmtDelta(summary?.headline?.score)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Best time</div>
            <div className="px-3 py-1 rounded-full text-sm bg-gray-100">
              {summary?.headline?.best_time ? `${summary.headline.best_time.window} · n=${summary.headline.best_time.n}` : "—"}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">Best recipe</div>
            <div className="px-3 py-1 rounded-full text-sm bg-gray-100">
              {summary?.headline?.recipe
                ? `${summary.headline.recipe.label}${
                    summary.headline.recipe.energy ? ` (${summary.headline.recipe.energy})` : ""
                  } · ${fmtDelta(summary.headline.recipe.impact)} · n=${summary.headline.recipe.n}`
                : "—"}
            </div>
          </div>

          <div className="ml-auto text-sm text-gray-600">{summary?.headline?.copy?.line || ""}</div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {summary?.recommendations?.play_url && (
            <a
              href={summary.recommendations.play_url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg border bg-black text-white text-sm"
            >
              Play boosters on Spotify
            </a>
          )}
          {icsHref && (
            <a href={icsHref} download="soundmind-best-time.ics" className="px-3 py-2 rounded-lg border text-sm">
              Schedule best time
            </a>
          )}
          <span className="ml-auto text-xs text-gray-500">{summary?.recommendations?.notes || ""}</span>
        </div>
      </section>

      {/* Boosters / Drainers */}
      <BubbleRow
        title="Boosting genres"
        items={summary?.boosters?.genres || []}
        onPick={() => {}}
        emptyText="Log a few more sessions with music to surface winners."
      />
      <BubbleRow title="Boosting artists" items={summary?.boosters?.artists || []} />
      <BubbleRow title="Draining genres" items={summary?.drainers?.genres || []} />
      <BubbleRow title="Draining artists" items={summary?.drainers?.artists || []} />

      {/* Digest (short) */}
      <section className="rounded-xl border bg-white p-4">
        <div className="font-medium mb-2">Recent sessions (digest)</div>
        <div className="space-y-3">
          {timeline?.length ? (
            timeline.map((d) => (
              <div key={d.date} className="rounded border p-3">
                <div className="text-sm font-medium mb-2">{fmtDate(d.date)}</div>
                <div className="space-y-2">
                  {d.sessions.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 text-sm">
                      <span className="px-2 py-1 rounded bg-gray-100">{s.split || "—"}</span>
                      <span>{fmtTime(s.time)}</span>
                      <span className={`${(s.z ?? 0) > 0 ? "text-green-700" : (s.z ?? 0) < 0 ? "text-red-700" : "text-gray-600"}`}>
                        workout {fmtDelta(s.z)}
                      </span>
                      <span className={`ml-auto ${ (s.mood_delta ?? 0) > 0 ? "text-green-700" : (s.mood_delta ?? 0) < 0 ? "text-red-700" : "text-gray-600"}`}>
                        mood {fmtDelta(s.mood_delta)}
                      </span>
                      <span className="text-gray-700">
                        {s.pre?.artist ? `${s.pre.artist}${s.pre?.genre ? ` · ${s.pre.genre}` : ""}` : s.pre?.genre || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">No sessions in range.</div>
          )}
        </div>
      </section>

      {loading && <div className="text-sm text-gray-500">Updating…</div>}
    </div>
  );
} 

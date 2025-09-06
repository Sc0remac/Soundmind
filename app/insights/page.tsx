"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SummaryRes = {
  filters: { days: number; split: string | null; sample: number };
  cards: {
    music_to_performance: { headline: string; uplift: number | null; n: number; confidence: "low"|"medium"|"high" };
    music_to_mood: { headline: string; uplift: number | null; n: number; confidence: "low"|"medium"|"high" };
    best_bpm_band: { band: string; uplift: number; n: number } | null;
    best_time_of_day: { bucket: string; uplift: number; n: number } | null;
    top_genres: { genre: string; perf: number; mood: number; n: number }[];
  };
};

type SoundCell = { bpm: string; energy: "low"|"mid"|"high"; count: number; perf: number; mood: number };

export default function InsightsPage() {
  const [days, setDays] = useState(30);
  const [split, setSplit] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [map, setMap] = useState<SoundCell[] | null>(null);
  const [timeline, setTimeline] = useState<any[] | null>(null);
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

      const [s, m, t] = await Promise.all([
        fetch(`/api/insights/summary?${filtersQS}`, { headers }).then((r) => r.json()),
        fetch(`/api/insights/soundmap?days=${days}`, { headers }).then((r) => r.json()),
        fetch(`/api/insights/timeline?days=${days}`, { headers }).then((r) => r.json()),
      ]);

      setSummary(s);
      setMap(m?.cells || []);
      setTimeline(t?.items || []);
      setLoading(false);
    })();
  }, [filtersQS, days]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <div className="ml-auto flex items-center gap-2">
          <select className="border rounded p-2" value={days} onChange={(e)=>setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select className="border rounded p-2" value={split ?? ""} onChange={(e)=>setSplit(e.target.value || null)}>
            <option value="">All splits</option>
            <option>Push</option><option>Pull</option><option>Legs</option>
            <option>Upper</option><option>Lower</option><option>Arms</option><option>Back</option>
            <option>Full Body</option>
          </select>
        </div>
      </div>

      {/* Top tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          title="Music → Performance"
          subtitle={summary?.cards.music_to_performance.headline || ""}
          value={fmtDelta(summary?.cards.music_to_performance.uplift)}
          tag={confBadge(summary?.cards.music_to_performance.confidence)}
        />
        <Tile
          title="Music → Mood"
          subtitle={summary?.cards.music_to_mood.headline || ""}
          value={fmtDelta(summary?.cards.music_to_mood.uplift)}
          tag={confBadge(summary?.cards.music_to_mood.confidence)}
        />
        <Tile
          title="Best BPM band"
          value={summary?.cards.best_bpm_band ? `${summary.cards.best_bpm_band.band} (${fmtDelta(summary.cards.best_bpm_band.uplift)})` : "—"}
          subtitle={summary?.cards.best_bpm_band ? `n=${summary.cards.best_bpm_band.n}` : ""}
        />
        <Tile
          title="Best time"
          value={summary?.cards.best_time_of_day ? `${summary.cards.best_time_of_day.bucket} (${fmtDelta(summary.cards.best_time_of_day.uplift)})` : "—"}
          subtitle={summary?.cards.best_time_of_day ? `n=${summary.cards.best_time_of_day.n}` : ""}
        />
      </div>

      {/* Genre chips */}
      <Card title="Genres that help you most">
        <div className="flex flex-wrap gap-2">
          {summary?.cards.top_genres?.map((g) => (
            <div key={g.genre} className="px-3 py-2 rounded-full border text-sm">
              <span className="font-medium">{g.genre}</span>{" "}
              <span className="text-gray-500">perf {fmtDelta(g.perf)}, mood {fmtDelta(g.mood)} · n={g.n}</span>
            </div>
          )) || <div className="text-sm text-gray-500">Not enough data yet.</div>}
        </div>
      </Card>

      {/* Sound & sweat map */}
      <Card title="Your sound & sweat map" subtitle="BPM × Energy → average performance/mood">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          <CellHeader />
          {["<110","110–127","128–135",">135"].map((bpm) => (
            <div key={bpm} className="text-xs text-gray-500 text-center">{bpm}</div>
          ))}
          {["low","mid","high"].map((en) => (
            <>
              <div key={`${en}-head`} className="text-xs text-gray-500">{en.toUpperCase()}</div>
              {["<110","110–127","128–135",">135"].map((bpm) => {
                const cell = map?.find((c)=>c.bpm===bpm && c.energy===en);
                return <HeatCell key={`${en}-${bpm}`} cell={cell} />;
              })}
            </>
          ))}
        </div>
      </Card>

      {/* Timeline digest */}
      <Card title="Recent sessions (digest)">
        <div className="space-y-4">
          {timeline?.map((d)=>(
            <div key={d.date} className="rounded border p-3">
              <div className="text-sm font-medium mb-2">{fmtDate(d.date)}</div>
              <div className="space-y-2">
                {d.sessions.map((s:any)=>(
                  <div key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="px-2 py-1 rounded bg-gray-100">{s.split || "—"}</span>
                    <span>{fmtTime(s.time)}</span>
                    <span>tonnage {Math.round(s.tonnage || 0)}</span>
                    <span className="text-gray-500">sets {s.sets}</span>
                    <span className="text-gray-700">pre:
                      {s.pre.band ? ` ${s.pre.band} BPM` : ""}{s.pre.energy!=null ? ` · energy ${s.pre.energy.toFixed(2)}`:""}{s.pre.genre ? ` · ${s.pre.genre}`:""}
                    </span>
                    <span className={`ml-auto ${s.mood_delta>0?'text-green-700':s.mood_delta<0?'text-red-700':'text-gray-600'}`}>
                      mood {fmtDelta(s.mood_delta)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )) || <div className="text-sm text-gray-500">No sessions in range.</div>}
        </div>
      </Card>

      {loading && <div className="text-sm text-gray-500">Updating…</div>}
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function Tile({ title, subtitle, value, tag }: { title: string; subtitle?: string; value: string; tag?: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-4 bg-white">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-gray-600">{title}</div>
        {tag}
      </div>
      <div className="text-xl font-semibold">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}
function Card({ title, subtitle, children }:{title:string; subtitle?:string; children:any}) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <div className="mb-3">
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}
function confBadge(level?: "low"|"medium"|"high") {
  const c = level==="high"?"bg-green-100 text-green-800":level==="medium"?"bg-amber-100 text-amber-800":"bg-gray-100 text-gray-800";
  return <span className={`text-xs px-2 py-1 rounded ${c}`}>{level||"—"}</span>;
}
function fmtDelta(x?: number|null) {
  if (x==null || isNaN(x)) return "—";
  const sign = x>0?"+":"";
  return `${sign}${x.toFixed(2)}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function CellHeader(){ return <div/> }
function HeatCell({ cell }:{ cell?: SoundCell }) {
  if (!cell) return <div className="h-14 rounded border bg-gray-50" />;
  const hue = cell.perf >= 0 ? 150 : 0; // green vs red
  const intensity = Math.min(1, Math.abs(cell.perf)/1.0); // clamp around 1 SD
  const bg = `hsl(${hue} 80% ${92 - 30*intensity}%)`;
  return (
    <div className="h-14 rounded border flex flex-col items-center justify-center" style={{ background: bg }}>
      <div className="text-sm font-medium">{fmtDelta(cell.perf)}</div>
      <div className="text-[11px] text-gray-600">{cell.count} · mood {fmtDelta(cell.mood)}</div>
    </div>
  );
}

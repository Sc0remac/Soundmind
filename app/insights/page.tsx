"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SummaryRes = {
  filters: { days: number; split: string | null; genre: string | null; artist: string | null; sample: number };
  cards: {
    music_to_performance: { headline: string; uplift: number | null; n: number; confidence: "low"|"medium"|"high" };
    music_to_mood: { headline: string; uplift: number | null; n: number; confidence: "low"|"medium"|"high" };
    top_artist_performance: { artist: string; uplift: number; n: number } | null;
    top_genre_mood: { genre: string; uplift: number; n: number } | null;
    best_time_of_day: { bucket: string; uplift: number; n: number } | null;
    top_genres: { genre: string; perf: number; mood: number; n: number }[];
    top_artists: { artist: string; perf: number; mood: number; n: number }[];
  };
};

type SoundCell = { label: string; energy: "low" | "mid" | "high"; count: number; perf: number; mood: number };

export default function InsightsPage() {
  const [days, setDays] = useState(30);
  const [split, setSplit] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [artist, setArtist] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"genre" | "artist">("genre");

  const [summary, setSummary] = useState<SummaryRes | null>(null);
  const [map, setMap] = useState<SoundCell[] | null>(null);
  const [timeline, setTimeline] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const energyLevels = ["low", "mid", "high"] as const;

  const filtersQS = useMemo(() => {
    const p = new URLSearchParams();
    p.set("days", String(days));
    if (split) p.set("split", split);
    if (genre) p.set("genre", genre);
    if (artist) p.set("artist", artist);
    return p.toString();
  }, [days, split, genre, artist]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const [s, m, t] = await Promise.all([
        fetch(`/api/insights/summary?${filtersQS}`, { headers }).then((r) => r.json()),
        fetch(`/api/insights/soundmap?${filtersQS}&mode=${mapMode}`, { headers }).then((r) => r.json()),
        fetch(`/api/insights/timeline?${filtersQS}`, { headers }).then((r) => r.json()),
      ]);

      setSummary(s?.error ? null : s);
      setMap(m?.error ? [] : m?.cells || []);
      setTimeline(t?.error ? [] : t?.items || []);
      setLoading(false);
    })();
  }, [filtersQS, mapMode]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
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
          <select className="border rounded p-2" value={genre ?? ""} onChange={(e)=>{setGenre(e.target.value || null); setArtist(null); setMapMode("genre");}}>
            <option value="">All genres</option>
            {summary?.cards?.top_genres?.map((g)=>(
              <option key={g.genre} value={g.genre}>{g.genre}</option>
            ))}
          </select>
          <select className="border rounded p-2" value={artist ?? ""} onChange={(e)=>setArtist(e.target.value || null)}>
            <option value="">All artists</option>
            {summary?.cards?.top_artists?.map((a)=>(
              <option key={a.artist} value={a.artist}>{a.artist}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Top tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile
          title="Music & Workouts"
          subtitle={summary?.cards?.music_to_performance?.headline || ""}
          value={fmtDelta(summary?.cards?.music_to_performance?.uplift)}
          tag={confBadge(summary?.cards?.music_to_performance?.confidence)}
        />
        <Tile
          title="Music & Mood"
          subtitle={summary?.cards?.music_to_mood?.headline || ""}
          value={fmtDelta(summary?.cards?.music_to_mood?.uplift)}
          tag={confBadge(summary?.cards?.music_to_mood?.confidence)}
        />
        <Tile
          title="Top artist for workouts"
          value={summary?.cards?.top_artist_performance?.artist || "—"}
            subtitle={summary?.cards?.top_artist_performance ? `impact ${fmtDelta(summary?.cards?.top_artist_performance?.uplift)} · sessions ${summary?.cards?.top_artist_performance?.n}` : ""}
        />
        <Tile
          title="Top genre for mood"
          value={summary?.cards?.top_genre_mood?.genre || "—"}
            subtitle={summary?.cards?.top_genre_mood ? `lift ${fmtDelta(summary?.cards?.top_genre_mood?.uplift)} · sessions ${summary?.cards?.top_genre_mood?.n}` : ""}
        />
      </div>
      {summary?.cards?.best_time_of_day && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile
            title="Best time"
            value={summary?.cards?.best_time_of_day ? `${summary?.cards?.best_time_of_day?.bucket}` : "—"}
            subtitle={summary?.cards?.best_time_of_day ? `sessions ${summary?.cards?.best_time_of_day?.n} · impact ${fmtDelta(summary?.cards?.best_time_of_day?.uplift)}` : ""}
          />
        </div>
      )}

      {/* Genre chips */}
      <Card title="Genre breakdown">
        <div className="flex flex-wrap gap-2">
          {summary?.cards?.top_genres?.map((g) => (
            <div
              key={g.genre}
              className="px-3 py-2 rounded-full border text-sm cursor-pointer"
              onClick={() => {
                setGenre(g.genre);
                setMapMode("artist");
                setArtist(null);
              }}
            >
              <span className="font-medium">{g.genre}</span>{" "}
              <span className="text-gray-500">workout {fmtDelta(g.perf)}, mood {fmtDelta(g.mood)} · {g.n} sessions</span>
            </div>
          )) || <div className="text-sm text-gray-500">Not enough data yet.</div>}
        </div>
      </Card>

      {/* Artist chips */}
      <Card title="Artist breakdown">
        <div className="flex flex-wrap gap-2">
          {summary?.cards?.top_artists?.map((a) => (
            <div key={a.artist} className="px-3 py-2 rounded-full border text-sm">
              <span className="font-medium">{a.artist}</span>{" "}
              <span className="text-gray-500">workout {fmtDelta(a.perf)}, mood {fmtDelta(a.mood)} · {a.n} sessions</span>
            </div>
          )) || <div className="text-sm text-gray-500">Not enough data yet.</div>}
        </div>
      </Card>

      {/* Sound & sweat map */}
      <Card
        title="Your sound & sweat map"
        subtitle={`${mapMode === "genre" ? "Genre" : "Artist"} × Energy → average workout/mood`}
      >
        {(() => {
          const labels = Array.from(new Set(map?.map((c) => c.label) || []));
          return (
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${energyLevels.length + 1}, minmax(0,1fr))` }}
            >
              <CellHeader />
              {energyLevels.map((e) => (
                <div key={e} className="text-xs text-gray-500 text-center">
                  {e.toUpperCase()}
                </div>
              ))}
              {labels.map((label) => (
                <Fragment key={label}>
                  <div
                    className="text-xs text-gray-500 cursor-pointer"
                    onClick={() => {
                      if (mapMode === "genre") {
                        setGenre(label);
                        setMapMode("artist");
                        setArtist(null);
                      }
                    }}
                  >
                    {label}
                  </div>
                  {energyLevels.map((en) => {
                    const cell = map?.find((c) => c.label === label && c.energy === en);
                    return <HeatCell key={`${label}-${en}`} cell={cell} />;
                  })}
                </Fragment>
              ))}
            </div>
          );
        })()}
        {mapMode === "artist" && (
          <button
            className="text-xs text-blue-600 mt-2"
            onClick={() => {
              setGenre(null);
              setMapMode("genre");
            }}
          >
            Back to genres
          </button>
        )}
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
                    <span>effort {Math.round(s.tonnage || 0)}</span>
                    <span className="text-gray-500">sets {s.sets}</span>
                    <span className="text-gray-700">
                      before: {s.pre.artist ? `${s.pre.artist}${s.pre.genre ? ` · ${s.pre.genre}` : ""}` : s.pre.genre || ""}
                    </span>
                    <span className={`${s.z>0?'text-green-700':s.z<0?'text-red-700':'text-gray-600'}`}>workout {fmtDelta(s.z)}</span>
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

      {/* Actionable insights */}
      <Card title="Takeaways">
        <ul className="list-disc list-inside text-sm space-y-1">
          {summary?.cards?.top_artist_performance && (
            <li>Songs from {summary?.cards?.top_artist_performance?.artist} have lined up with stronger workouts.</li>
          )}
          {summary?.cards?.top_genre_mood && (
            <li>{summary?.cards?.top_genre_mood?.genre} tracks often pair with brighter moods.</li>
          )}
        </ul>
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
      <div className="text-[11px] text-gray-600">{cell.count} sessions · mood {fmtDelta(cell.mood)}</div>
    </div>
  );
}

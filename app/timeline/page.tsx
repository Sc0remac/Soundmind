// app/timeline/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { GroupedVirtuoso } from "react-virtuoso";
import { Button, Chip, Modal, ModalBody, ModalContent, ModalHeader, useDisclosure } from "@nextui-org/react";
import { Dumbbell, Smile, Music2, ChevronDown, ChevronRight, Search, CalendarDays, Plus, SortDesc, SortAsc, Sparkles } from "lucide-react";

// -------- Types matching /api/timeline --------
type ApiDay = {
  date: string; // YYYY-MM-DD
  summary: {
    mood_avg: number | null;
    mood_count: number;
    workout_volume: number | null;
    workout_count: number;
    music_minutes: number | null;
    track_count: number;
  };
  entries: Array<
    | { type: "workout"; id: string; at: string; name: string; split_name: string | null; volume: number | null }
    | { type: "mood"; id: string; at: string; score: number; post_workout: boolean; energy: number | null; stress: number | null; label: string | null }
    | { type: "music"; id: string; at: string; track_id: string; track_name: string | null; artist_name: string | null; album_image_url: string | null; duration_ms: number | null }
  >;
};

// -------- UI-local types --------
type RowBase = { kind: "workout" | "mood" | "music" | "bundle"; at: string; anchor?: string };
type UiWorkout = RowBase & { kind: "workout"; id: string; name: string; split: string | null; volume: number | null };
type UiMood = RowBase & { kind: "mood"; id: string; score: number; energy: number | null; stress: number | null; post_workout: boolean; label: string | null; linkWorkoutId?: string | null };
type UiMusic = RowBase & { kind: "music"; id: string; track_id: string; track_name: string | null; artist_name: string | null; album_image_url: string | null; duration_ms: number | null };
type UiBundle = RowBase & {
  kind: "bundle";
  id: string; // synthetic
  title: string; // e.g., "9 tracks • 72 min" or "During workout: 7 tracks"
  duringWorkoutId?: string | null;
  count: number;
  minutes: number;
  topTrack?: { name: string | null; artist: string | null } | null;
  thumbs: string[]; // up to 3 album images
  tracks: UiMusic[]; // full list used in drawer
};
type UiRow = UiWorkout | UiMood | UiMusic | UiBundle;
type UiDay = { date: string; summary: ApiDay["summary"]; rows: UiRow[] };

// --------- Helpers ---------
const to24h = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const dateLabel = (isoDay: string) => {
  const d = new Date(`${isoDay}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};
function minutesFromMs(list: { duration_ms: number | null }[]) {
  const total = list.reduce((acc, t) => acc + (typeof t.duration_ms === "number" ? t.duration_ms : 0), 0);
  return Math.round(total / 60000);
}

function uniq<T>(arr: T[]): T[] {
  const s = new Set<T>();
  const out: T[] = [];
  for (const x of arr) if (!s.has(x)) { s.add(x); out.push(x); }
  return out;
}

function bundleListens(
  listens: UiMusic[],
  workouts: UiWorkout[],
  density: "comfortable" | "compact"
): UiRow[] {
  if (!listens.length) return [];
  const byWorkout: UiBundle[] = [];
  const remaining: UiMusic[] = [];

  // Workout windows: [start, start+2h]
  const windows = workouts.map((w) => ({ id: w.id, start: new Date(w.at).getTime(), end: new Date(w.at).getTime() + 2 * 3600_000 }));

  // Partition listens into during-workout vs the rest
  for (const tr of [...listens].sort((a, b) => (a.at < b.at ? -1 : 1))) {
    const t = new Date(tr.at).getTime();
    const win = windows.find((w) => t >= w.start && t <= w.end);
    if (win) {
      let b = byWorkout.find((x) => x.duringWorkoutId === win.id);
      if (!b) {
        b = {
          kind: "bundle",
          id: `bundle-w-${win.id}`,
          at: new Date(win.start).toISOString(),
          title: "",
          duringWorkoutId: win.id,
          count: 0,
          minutes: 0,
          topTrack: null,
          thumbs: [],
          tracks: [],
        };
        byWorkout.push(b);
      }
      b.tracks.push(tr);
      b.count += 1;
      b.minutes = minutesFromMs(b.tracks);
      const first = b.tracks[0];
      b.topTrack = { name: first.track_name, artist: first.artist_name };
      b.thumbs = uniq(b.tracks.map((x) => x.album_image_url!).filter(Boolean)).slice(0, 3) as string[];
    } else {
      remaining.push(tr);
    }
  }

  // Time-based clustering for the remaining
  const maxGapMs = 15 * 60 * 1000;
  const maxSpanMs = 90 * 60 * 1000;
  const threshold = density === "compact" ? 1 : 3; // compact always bundles

  const clusters: UiMusic[][] = [];
  let curr: UiMusic[] = [];
  const sorted = remaining.sort((a, b) => (a.at < b.at ? -1 : 1));
  for (const tr of sorted) {
    if (!curr.length) {
      curr.push(tr);
      continue;
    }
    const prev = curr[curr.length - 1];
    const gap = new Date(tr.at).getTime() - new Date(prev.at).getTime();
    const span = new Date(tr.at).getTime() - new Date(curr[0].at).getTime();
    if (gap <= maxGapMs && span <= maxSpanMs) {
      curr.push(tr);
    } else {
      clusters.push(curr);
      curr = [tr];
    }
  }
  if (curr.length) clusters.push(curr);

  const rows: UiRow[] = [];
  for (const c of clusters) {
    if (c.length >= threshold) {
      rows.push({
        kind: "bundle",
        id: `bundle-${c[0].id}`,
        at: c[0].at,
        title: `${c.length} tracks • ${minutesFromMs(c)} min`,
        duringWorkoutId: null,
        count: c.length,
        minutes: minutesFromMs(c),
        topTrack: { name: c[0].track_name, artist: c[0].artist_name },
        thumbs: uniq(c.map((x) => x.album_image_url!).filter(Boolean)).slice(0, 3) as string[],
        tracks: c,
      });
    } else {
      rows.push(...c);
    }
  }

  // Label workout bundles
  byWorkout.forEach((b) => {
    b.title = `During workout: ${b.count} track${b.count === 1 ? "" : "s"}`;
  });

  return [...byWorkout, ...rows].sort((a, b) => (a.at < b.at ? -1 : 1));
}

function linkMoodToWorkout(m: UiMood, workouts: UiWorkout[]): UiMood {
  // If a mood is within ±90m of workout end (end ≈ start+2h), add link
  const created = new Date(m.at).getTime();
  for (const w of workouts) {
    const end = new Date(w.at).getTime() + 2 * 3600_000;
    if (Math.abs(created - end) <= 90 * 60 * 1000) return { ...m, linkWorkoutId: w.id };
  }
  return m;
}

// -------- Page --------
export default function TimelinePage() {
  const [days, setDays] = useState<ApiDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedSpotify, setConnectedSpotify] = useState<boolean | null>(null);

  // Toolbar state
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<{ workout: boolean; mood: boolean; music: boolean }>({ workout: true, mood: true, music: true });
  const [range, setRange] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sort, setSort] = useState<"desc" | "asc">("desc");

  // Collapsed state per day, persisted
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const loadCollapsed = useCallback(() => {
    try {
      const raw = localStorage.getItem("timeline.collapsed");
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }, []);

  const saveCollapsed = useCallback((m: Record<string, boolean>) => {
    try { localStorage.setItem("timeline.collapsed", JSON.stringify(m)); } catch {}
  }, []);

  const filtersQS = useMemo(() => {
    const p = new URLSearchParams();
    const typesArr = [types.workout && "workout", types.mood && "mood", types.music && "music"].filter(Boolean) as string[];
    p.set("types", typesArr.join(",") || "");
    if (range === "today") p.set("range", "today");
    else if (range === "7d") p.set("days", "7");
    else if (range === "30d") p.set("days", "30");
    else if (range === "custom" && customFrom && customTo) {
      p.set("from", new Date(customFrom).toISOString());
      p.set("to", new Date(customTo).toISOString());
    }
    p.set("sort", sort);
    return p.toString();
  }, [types, range, customFrom, customTo, sort]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Spotify connection flag for empty state CTA
        try {
          const { data } = await supabase.from("profiles").select("spotify_connected").single();
          setConnectedSpotify(Boolean(data?.spotify_connected));
        } catch {
          setConnectedSpotify(null);
        }

        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await fetch(`/api/timeline?${filtersQS}`, { headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load timeline");
        setDays((json.days || []) as ApiDay[]);

        // initialize collapsed: latest day expanded, others collapsed unless saved
        const saved = loadCollapsed();
        const map: Record<string, boolean> = { ...saved };
        const ds = (json.days || []) as ApiDay[];
        if (ds.length) {
          const mostRecent = ds[0].date;
          ds.forEach((d) => {
            if (saved[d.date] == null) map[d.date] = d.date === mostRecent ? false : true;
          });
        }
        setCollapsed(map);
        saveCollapsed(map);
      } catch {
        setDays([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [filtersQS, loadCollapsed, saveCollapsed]);

  const uiDays: UiDay[] = useMemo(() => {
    const arr: UiDay[] = [];
    for (const d of days) {
      const workouts: UiWorkout[] = d.entries
        .filter((e) => e.type === "workout")
        .map((w) => ({
          kind: "workout",
          id: (w as any).id,
          at: (w as any).at,
          name: (w as any).name,
          split: (w as any).split_name ?? null,
          volume: (w as any).volume ?? null,
          anchor: `workout-${(w as any).id}`,
        }));
      const moods: UiMood[] = d.entries
        .filter((e) => e.type === "mood")
        .map((m) => ({
          kind: "mood",
          id: (m as any).id,
          at: (m as any).at,
          score: (m as any).score,
          post_workout: Boolean((m as any).post_workout),
          energy: (m as any).energy ?? null,
          stress: (m as any).stress ?? null,
          label: (m as any).label ?? null,
        }));
      const tracks: UiMusic[] = d.entries
        .filter((e) => e.type === "music")
        .map((t) => ({
          kind: "music",
          id: (t as any).id,
          at: (t as any).at,
          track_id: (t as any).track_id,
          track_name: (t as any).track_name ?? null,
          artist_name: (t as any).artist_name ?? null,
          album_image_url: (t as any).album_image_url ?? null,
          duration_ms: (t as any).duration_ms ?? null,
        }));

      // Link moods to workouts by proximity
      const moodsLinked = moods.map((m) => linkMoodToWorkout(m, workouts));

      // Bundle music
      const bundlesAndSingles = bundleListens(tracks, workouts, density);

      const rows: UiRow[] = [...workouts, ...moodsLinked, ...bundlesAndSingles].sort((a, b) =>
        sort === "asc" ? (a.at < b.at ? -1 : 1) : a.at > b.at ? -1 : 1
      );

      // Apply search and type filters client-side
      const qx = q.trim().toLowerCase();
      const typeFlags = types;
      const filtered = rows.filter((r) => {
        if (r.kind === "workout" && !typeFlags.workout) return false;
        if (r.kind === "mood" && !typeFlags.mood) return false;
        if ((r.kind === "music" || r.kind === "bundle") && !typeFlags.music) return false;
        if (!qx) return true;
        if (r.kind === "workout") {
          return (
            r.name.toLowerCase().includes(qx) ||
            (r.split || "").toLowerCase().includes(qx) ||
            (typeof r.volume === "number" ? String(Math.round(r.volume)).includes(qx) : false)
          );
        }
        if (r.kind === "mood") {
          return (
            String(r.score).includes(qx) ||
            (r.label || "").toLowerCase().includes(qx) ||
            (r.post_workout ? "post-workout".includes(qx) : false)
          );
        }
        if (r.kind === "music") {
          return (
            (r.track_name || "").toLowerCase().includes(qx) ||
            (r.artist_name || "").toLowerCase().includes(qx)
          );
        }
        if (r.kind === "bundle") {
          return (
            r.title.toLowerCase().includes(qx) ||
            (r.topTrack?.name || "").toLowerCase().includes(qx) ||
            (r.topTrack?.artist || "").toLowerCase().includes(qx)
          );
        }
        return true;
      });

      arr.push({ date: d.date, summary: d.summary, rows: filtered });
    }
    return arr;
  }, [days, density, sort, q, types]);

  // Flatten for GroupedVirtuoso
  const groupCounts = uiDays.map((d) => (collapsed[d.date] ? 0 : d.rows.length));
  const flatRows: { dayIndex: number; row: UiRow }[] = [];
  uiDays.forEach((d, di) => {
    if (collapsed[d.date]) return;
    d.rows.forEach((row) => flatRows.push({ dayIndex: di, row }));
  });

  const toggleType = (k: keyof typeof types) => setTypes((x) => ({ ...x, [k]: !x[k] }));
  const allSelected = types.workout && types.mood && types.music;
  const setAll = (v: boolean) => setTypes({ workout: v, mood: v, music: v });

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [activeBundle, setActiveBundle] = useState<UiBundle | null>(null);

  function openBundle(b: UiBundle) {
    setActiveBundle(b);
    onOpen();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
        <div className="relative w-full sm:w-auto sm:min-w-[260px]">
          <input
            type="text"
            className="w-full rounded-lg border border-white/10 bg-transparent px-9 py-2 text-sm outline-none placeholder:text-white/50"
            placeholder="Search (bench, Coldplay, 8/10)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-white/60" />
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">Filters</span>
          <Button size="sm" variant={allSelected ? "flat" : "bordered"} onPress={() => setAll(!allSelected)}>
            All
          </Button>
          <Button size="sm" variant={types.workout ? "flat" : "bordered"} onPress={() => toggleType("workout")} startContent={<Dumbbell className="size-4" />}>Workouts</Button>
          <Button size="sm" variant={types.mood ? "flat" : "bordered"} onPress={() => toggleType("mood")} startContent={<Smile className="size-4" />}>Mood</Button>
          <Button size="sm" variant={types.music ? "flat" : "bordered"} onPress={() => toggleType("music")} startContent={<Music2 className="size-4" />}>Music</Button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="hidden sm:inline rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">Date</span>
          <Button size="sm" variant={range === "today" ? "flat" : "bordered"} onPress={() => setRange("today")} startContent={<CalendarDays className="size-4" />}>Today</Button>
          <Button size="sm" variant={range === "7d" ? "flat" : "bordered"} onPress={() => setRange("7d")}>7d</Button>
          <Button size="sm" variant={range === "30d" ? "flat" : "bordered"} onPress={() => setRange("30d")}>30d</Button>
          <Button size="sm" variant={range === "custom" ? "flat" : "bordered"} onPress={() => setRange("custom")}>Custom</Button>
          {range === "custom" && (
            <div className="flex items-center gap-1">
              <input type="date" className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-xs text-white/60">to</span>
              <input type="date" className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-sm" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">Density</span>
          <Button size="sm" variant={density === "comfortable" ? "flat" : "bordered"} onPress={() => setDensity("comfortable")}>Comfortable</Button>
          <Button size="sm" variant={density === "compact" ? "flat" : "bordered"} onPress={() => setDensity("compact")}>Compact</Button>
        </div>
        <div className="flex items-center gap-1">
          <span className="hidden sm:inline rounded-lg border border-white/10 px-2 py-1 text-xs text-white/70">Sort</span>
          <Button size="sm" variant="bordered" onPress={() => setSort((s) => (s === "desc" ? "asc" : "desc"))} startContent={sort === "desc" ? <SortDesc className="size-4" /> : <SortAsc className="size-4" />}>
            {sort === "desc" ? "Newest first" : "Oldest first"}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button as={Link} href="/log-mood" size="sm" color="success" variant="flat" startContent={<Plus className="size-4" />}>Mood</Button>
          <Button as={Link} href="/log-workout" size="sm" color="primary" variant="flat" startContent={<Plus className="size-4" />}>Workout</Button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="text-sm text-white/70">Loading…</div>
      ) : uiDays.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
          <div className="mb-3 text-base font-medium">No data in range</div>
          <div className="flex flex-wrap items-center gap-2">
            <Button as={Link} href="/log-mood" size="sm" variant="flat">+ Mood</Button>
            <Button as={Link} href="/log-workout" size="sm" variant="flat">+ Workout</Button>
            {connectedSpotify === false && (
              <Button as={Link} href="/music" size="sm" variant="flat">Connect Spotify</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5">
          <GroupedVirtuoso
            groupCounts={groupCounts}
            groupContent={(index) => {
              const d = uiDays[index];
              const isCollapsed = collapsed[d.date];
              return (
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-slate-900/70 px-3 py-2 backdrop-blur">
                  <button
                    onClick={() => {
                      const next = { ...collapsed, [d.date]: !isCollapsed };
                      setCollapsed(next);
                      saveCollapsed(next);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-left"
                  >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    <span className="font-medium">{dateLabel(d.date)}</span>
                    <span className="text-xs text-white/60">· {d.rows.length} entries</span>
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <Chip size="sm" variant="flat" className="bg-emerald-500/15">Mood {d.summary.mood_avg ?? "—"}</Chip>
                    <Chip size="sm" variant="flat" className="bg-indigo-500/15">Vol {d.summary.workout_volume != null ? d.summary.workout_volume : "—"}</Chip>
                    <Chip size="sm" variant="flat" className="bg-violet-500/15">{d.summary.music_minutes != null ? `${d.summary.music_minutes} min` : "—"}</Chip>
                  </div>
                </div>
              );
            }}
            itemContent={(i) => {
              const { row, dayIndex } = flatRows[i];
              const pad = density === "compact" ? "py-1.5" : "py-2.5";
              const border = row.kind === "mood" ? "border-l-2 border-l-emerald-500/40" : row.kind === "workout" ? "border-l-2 border-l-indigo-500/40" : row.kind === "bundle" || row.kind === "music" ? "border-l-2 border-l-violet-500/40" : "";
              return (
                <div key={`${dayIndex}-${i}`} className={`flex items-start gap-3 px-3 ${pad} ${border}`}>
                  <time className="w-12 shrink-0 text-xs tabular-nums text-white/70">{to24h(row.at)}</time>
                  {row.kind === "workout" ? (
                    <div id={(row as UiWorkout).anchor} className="flex w-full items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500/15 text-indigo-300 ring-1 ring-white/10">
                        <Dumbbell className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.name}</div>
                        <div className="text-xs text-white/60">
                          {(row as UiWorkout).split || "Session"}
                          {typeof row.volume === "number" && (
                            <span className="ml-1">• vol {Math.round(row.volume)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : row.kind === "mood" ? (
                    <div className="flex w-full items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-300 ring-1 ring-white/10">
                        <Smile className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">Mood {row.score}/10 {row.label ? `· ${row.label}` : ""}</div>
                        <div className="text-xs text-white/60">
                          {row.energy != null && <span>energy {row.energy}</span>}
                          {row.stress != null && <span className="ml-1">• stress {row.stress}</span>}
                          {row.post_workout && <Chip size="sm" variant="flat" className="ml-2 bg-emerald-500/15">post-workout</Chip>}
                          {row.linkWorkoutId && (
                            <Link href={`#workout-${row.linkWorkoutId}`} className="ml-2 text-xs underline underline-offset-2">after workout</Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : row.kind === "music" ? (
                    <div className="flex w-full items-center gap-3">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/15 text-violet-300 ring-1 ring-white/10">
                        <Music2 className="size-4" />
                      </div>
                      {row.album_image_url && (
                        <Image src={row.album_image_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{row.track_name || "Unknown track"} <span className="text-white/60">— {row.artist_name || "Unknown"}</span></div>
                        <div className="text-xs text-white/60">{typeof row.duration_ms === "number" ? `${Math.round(row.duration_ms / 1000)}s` : ""}</div>
                      </div>
                    </div>
                  ) : (
                    // bundle
                    <button onClick={() => openBundle(row as UiBundle)} className="group flex w-full items-center gap-3 text-left">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-violet-500/15 text-violet-300 ring-1 ring-white/10">
                        <Music2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{(row as UiBundle).title}</div>
                        <div className="text-xs text-white/60">
                          {row.kind === "bundle" && (row as UiBundle).topTrack?.name ? (
                            <>Top: '{(row as UiBundle).topTrack?.name}' — {(row as UiBundle).topTrack?.artist}</>
                          ) : (
                            <>&nbsp;</>
                          )}
                        </div>
                      </div>
                      <div className="ml-auto grid grid-cols-3 gap-1">
                        {(row as UiBundle).thumbs.map((src, idx) => (
                          <Image key={idx} src={src} alt="" width={28} height={28} className="h-7 w-7 rounded object-cover" />
                        ))}
                      </div>
                    </button>
                  )}
                </div>
              );
            }}
          />
        </div>
      )}

      {/* End-of-week banner */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <div className="text-sm text-white/80">Explore trends and patterns for your week</div>
        <Button as={Link} href="/insights" variant="flat" size="sm" startContent={<Sparkles className="size-4" />}>View weekly insights</Button>
      </div>

      {/* Bundle drawer/sheet */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="full" backdrop="blur" placement="center" classNames={{ base: "md:max-w-[560px]" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Music2 className="size-4" />
                <span>{activeBundle?.title}</span>
              </ModalHeader>
              <ModalBody>
                {activeBundle ? (
                  <div className="max-h-[60dvh] overflow-y-auto">
                    {activeBundle.tracks.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-1 py-2">
                        {t.album_image_url && (
                          <Image src={t.album_image_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.track_name || "Unknown track"} <span className="text-white/60">— {t.artist_name || "Unknown"}</span></div>
                          <div className="text-xs text-white/60">{to24h(t.at)} · {typeof t.duration_ms === "number" ? `${Math.round(t.duration_ms / 1000)}s` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}

// app/music/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Chip,
  Skeleton,
} from "@nextui-org/react";
import {
  Music2,
  Disc3,
  Headphones,
  Sparkles,
  ListMusic,
  RefreshCcw,
  Play,
  PlugZap,
  BadgeCheck,
  Radio,
} from "lucide-react";

// --- types kept intentionally loose to tolerate small schema drift ---
type Listen = {
  id: string;
  track_name?: string | null;
  artist_name?: string | null;
  played_at?: string | null; // ISO
  genre?: string | null;
  genre_tags?: string[] | null;
};

type Artist = {
  id: string;
  name: string;
  play_count?: number | null;
};

const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");

const PAGE_SIZE = 20;

export default function MusicPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [listens, setListens] = useState<Listen[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [topGenres, setTopGenres] = useState<{ genre: string; count: number }[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(0);

  const loadAll = async () => {
    setLoading(true);
    // 1) Spotify connection flag
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("spotify_connected")
        .single();
      setConnected(Boolean(prof?.spotify_connected));
    } catch {
      setConnected(false);
    }

    // 2) Full listen history
    let rows: Listen[] = [];
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;
      const res = await fetch("/api/music/list", { headers });
      if (res.ok) {
        const json = await res.json();
        rows = json.rows ?? [];
      }
      setListens(rows);
      setPage(0);
    } catch {
      setListens([]);
    }

    // 3) Top artists (aggregate locally)
    try {
      const map = new Map<string, number>();
      rows.forEach((r) => {
        const key = r.artist_name ?? "";
        if (!key) return;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
      const agg = [...map.entries()]
        .map(([name, play_count], i) => ({ id: String(i), name, play_count }))
        .sort((a, b) => (b.play_count ?? 0) - (a.play_count ?? 0))
        .slice(0, 10);
      setTopArtists(agg);
    } catch {
      setTopArtists([]);
    }

    // 4) Top genres (aggregate locally)
    try {
      const map = new Map<string, number>();
      rows.forEach((r) => {
        const g = (r.genre ?? "").trim();
        if (!g) return;
        map.set(g, (map.get(g) ?? 0) + 1);
      });
      const list = [...map.entries()]
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopGenres(list);
    } catch {
      setTopGenres([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const connect = () => {
    window.location.href = "/api/spotify/start";
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;
      const res = await fetch("/api/spotify/my/sync", { method: "POST", headers });
      if (!res.ok) throw new Error("Sync failed");
      await fetch("/api/enrich/run", { method: "POST", headers });
      await loadAll();
    } catch {
      // could toast an error
    } finally {
      setSyncing(false);
    }
  };

  const playBoosters = () => {
    window.location.href = "/insights";
  };

  const start = page * PAGE_SIZE;
  const pageTracks = listens.slice(start, start + PAGE_SIZE);
  const hasNext = start + PAGE_SIZE < listens.length;

  return (
    <main className="space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 p-2 ring-1 ring-white/20">
          <Music2 className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Music</h1>
      </div>

      {/* Connection & quick actions */}
      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-2 ring-1 ring-emerald-500/30">
              {connected ? <BadgeCheck className="size-4" /> : <PlugZap className="size-4" />}
            </div>
            <div>
              <div className="text-sm font-medium">
                {connected ? "Spotify connected" : "Connect Spotify to unlock insights"}
              </div>
              <div className="text-xs text-white/60">
                {connected
                  ? "We’ll sync your listens to correlate with workouts and mood."
                  : "Playlists, boosters, and correlation require a quick connect."}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {connected ? (
              <>
                <Button
                  variant="flat"
                  startContent={<RefreshCcw className="size-4" />}
                  isLoading={syncing}
                  onPress={syncNow}
                >
                  Sync now
                </Button>
                <Button
                  variant="flat"
                  startContent={<Play className="size-4" />}
                  onPress={playBoosters}
                >
                  Play boosters
                </Button>
              </>
            ) : (
              <Button
                variant="flat"
                startContent={<PlugZap className="size-4" />}
                onPress={connect}
              >
                Connect
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Top artists */}
      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-pink-400 to-fuchsia-500 p-2 ring-1 ring-white/20">
            <Disc3 className="size-5" />
          </div>
          <h2 className="text-lg font-semibold">Top artists</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))
          ) : topArtists.length ? (
            topArtists.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="size-4" />
                  <span className="text-sm">{a.name}</span>
                </div>
                <span className="text-xs text-white/60">{a.play_count ?? "—"}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">No artist data yet.</div>
          )}
        </CardBody>
      </Card>

      {/* Recent listens */}
      <Card className="border border-white/10 bg-white/5">
        <CardHeader className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 p-2 ring-1 ring-white/20">
            <ListMusic className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Recent listens</h2>
            <p className="text-xs text-white/60">
              Showing {pageTracks.length} of {listens.length}
            </p>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))
          ) : pageTracks.length ? (
            pageTracks.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    {r.track_name ?? "Unknown track"}
                    <span className="text-white/60"> — {r.artist_name ?? "Unknown"}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-xs">
                    {r.genre && (
                      <Chip size="sm" variant="flat" className="bg-teal-500/20">
                        {r.genre}
                      </Chip>
                    )}
                    {r.genre_tags?.slice(0, 3).map((g) => (
                      <Chip key={g} size="sm" variant="flat" className="bg-teal-500/10">
                        {g}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-white/50">{fmt(r.played_at)}</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">
              No listens yet. {connected ? "Hit “Sync now” to pull your history." : "Connect Spotify to begin."}
            </div>
          )}
        </CardBody>
        <CardFooter className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button
              variant="flat"
              isDisabled={page === 0}
              onPress={() => setPage((p) => Math.max(p - 1, 0))}
            >
              Prev
            </Button>
            <Button
              variant="flat"
              isDisabled={!hasNext}
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
          <Button as={Link} href="/insights" variant="flat" startContent={<Sparkles className="size-4" />}>
            See music insights
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

// app/music/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Divider,
  Avatar,
  Spinner,
} from "@nextui-org/react";
import { Music2, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type Listen = {
  played_at: string;
  track_name?: string | null;
  artist_name?: string | null;
  album_name?: string | null;
  bpm?: number | null;
  energy?: number | null; // 0..1 expected if present
  source?: string | null;
  track_uri?: string | null; // e.g. spotify:track:ID
  image_url?: string | null;
};

function toEnergyBucket(energy?: number | null, bpm?: number | null) {
  if (energy != null && !Number.isNaN(energy)) {
    if (energy < 0.33) return "low";
    if (energy < 0.66) return "mid";
    return "high";
  }
  if (bpm != null && !Number.isNaN(bpm)) {
    if (bpm < 110) return "low";
    if (bpm < 128) return "mid";
    return "high";
  }
  return null;
}

function spotifyTrackUrlFromUri(uri?: string | null) {
  if (!uri) return null;
  // spotify:track:ID
  const parts = uri.split(":");
  if (parts.length === 3 && parts[1] === "track") {
    return `https://open.spotify.com/track/${parts[2]}`;
  }
  return null;
}

function fallbackSpotifySearch(track?: string | null, artist?: string | null) {
  const q = [track, artist].filter(Boolean).join(" ");
  return q ? `https://open.spotify.com/search/${encodeURIComponent(q)}` : null;
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dys = Math.floor(h / 24);
  return `${dys}d ago`;
}

export default function MusicPage() {
  const [query, setQuery] = useState("");
  const [list, setList] = useState<Listen[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Best-effort: view may expose different names; select '*' then map.
      const { data, error } = await supabase
        .from("v_spotify_listens_expanded")
        .select("*")
        .order("played_at", { ascending: false })
        .limit(100);

      if (error) {
        // Soft-fail: just show an empty state; you can toast if you have a toaster.
        setList([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as any[];
      const mapped: Listen[] = rows.map((r) => ({
        played_at: r.played_at || r.listened_at || r.timestamp,
        track_name: r.track_name || r.name || r.title,
        artist_name: r.artist_name || r.artist || r.primary_artist,
        album_name: r.album_name || r.album,
        bpm: r.bpm || r.tempo || null,
        energy: r.energy ?? r.energy_score ?? null,
        source: r.source || "Spotify",
        track_uri: r.track_uri || r.spotify_uri || null,
        image_url:
          r.image_url ||
          r.album_image_url ||
          r.cover_url ||
          r.artwork_url ||
          r.track_image_url ||
          null,
      }));
      setList(mapped);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((x) => {
      return (
        (x.track_name || "").toLowerCase().includes(q) ||
        (x.artist_name || "").toLowerCase().includes(q) ||
        (x.album_name || "").toLowerCase().includes(q)
      );
    });
  }, [list, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Music</h1>
        <div className="flex items-center gap-2">
          <Button
            as="a"
            href="/api/spotify/start"
            color="primary"
            variant="solid"
            startContent={<Music2 size={16} />}
          >
            Connect Spotify
          </Button>
          <Button as="a" href="/api/spotify/my/sync" variant="flat">
            Sync plays
          </Button>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="justify-between">
          <div className="flex items-center gap-2">
            <Music2 size={18} />
            <div className="font-medium">Recent listens</div>
          </div>
          <Input
            placeholder="Search tracks, artists, albums"
            value={query}
            onValueChange={setQuery}
            className="w-72 max-w-full"
          />
        </CardHeader>
        <Divider />
        <CardBody className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner label="Loading your recent plays…" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-default-200/60">
              {filtered.map((t, idx) => (
                <TrackRow key={`${t.played_at}-${idx}`} item={t} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ---------------- Components ---------------- */

function TrackRow({ item }: { item: Listen }) {
  const energyBucket = toEnergyBucket(item.energy ?? null, item.bpm ?? null);

  const spotifyUrl =
    spotifyTrackUrlFromUri(item.track_uri) ||
    fallbackSpotifySearch(item.track_name, item.artist_name);

  const energyChip =
    energyBucket === "high"
      ? { label: "High", color: "success" as const }
      : energyBucket === "mid"
      ? { label: "Mid", color: "warning" as const }
      : energyBucket === "low"
      ? { label: "Low", color: "default" as const }
      : null;

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar
        radius="sm"
        className="shrink-0"
        src={item.image_url || undefined}
        name={(item.track_name || "?").charAt(0)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-medium truncate">{item.track_name || "Unknown track"}</div>
          <div className="text-default-500 truncate">· {item.artist_name || "Unknown artist"}</div>
        </div>
        <div className="text-xs text-default-500 truncate">
          {item.album_name || "—"} • {timeAgo(item.played_at)}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2">
        {item.bpm ? (
          <Chip size="sm" variant="flat">
            {Math.round(item.bpm)} BPM
          </Chip>
        ) : null}
        {item.energy != null ? (
          <Chip size="sm" variant="flat">
            Energy {Math.round((item.energy || 0) * 100)}
          </Chip>
        ) : null}
        {energyChip ? (
          <Chip size="sm" color={energyChip.color} variant="flat">
            {energyChip.label}
          </Chip>
        ) : null}
        <Chip size="sm" variant="bordered">
          {item.source || "Spotify"}
        </Chip>
      </div>
      {spotifyUrl ? (
        <Button
          as="a"
          href={spotifyUrl}
          target="_blank"
          rel="noreferrer"
          size="sm"
          variant="light"
          startContent={<LinkIcon size={14} />}
          className="ml-2"
        >
          Open
        </Button>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-14 text-center text-sm text-default-500">
      No listens found. Try syncing your plays or refining your search.
    </div>
  );
}

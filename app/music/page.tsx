"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


type Row = {
  id: string;
  track_id: string;
  played_at: string;
  track_name: string;
  artist_name: string | null;
  album_image_url: string | null;
  bpm: number | null;
  energy: number | null;
  valence: number | null;
  genre: string | null;
};

export default function MusicPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/music/list", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const j = await res.json();
    if (res.ok) setRows(j.rows || []);
    else console.error("music/list error", j);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.track_name.toLowerCase().includes(qq) ||
        (r.artist_name || "").toLowerCase().includes(qq) ||
        (r.genre || "").toLowerCase().includes(qq)
    );
  }, [rows, q]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Music</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 w-80"
            placeholder="Search track, artist, or genre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <a
            className="px-3 py-2 rounded bg-black text-white"
            href="/profile"
            title="Go to profile to sync / enrich"
          >
            Enrich metadata
          </a>
        </div>
      </div>

      {!filtered.length ? (
        <p className="text-sm text-gray-500">No plays found.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="flex items-center gap-3 border rounded-lg p-3">
              <img
                src={r.album_image_url || "/placeholder.png"}
                alt=""
                className="h-12 w-12 rounded object-cover bg-gray-100"
                onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.track_name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {new Date(r.played_at).toLocaleString()} • {r.artist_name || "—"}
                </div>
              </div>
              <div className="text-xs text-gray-600 text-right">
                {r.genre ? <div>Genre: {r.genre}</div> : null}
                {r.bpm ? <div>BPM: {Math.round(r.bpm)}</div> : null}
                {r.energy != null ? <div>Energy: {r.energy.toFixed(2)}</div> : null}
                {r.valence != null ? <div>Valence: {r.valence.toFixed(2)}</div> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

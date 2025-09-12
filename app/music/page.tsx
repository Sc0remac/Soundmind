// app/music/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getServerSupabase } from "@/lib/supabaseServer";

// never cache user-specific output
export const revalidate = 0;

// ---- Types that match your views ----
type TopArtist = {
  user_id: string;
  artist_id: string;
  name: string;
  image_url: string | null;
  listens: number; // numeric -> number in JS
};

type TopGenre = {
  user_id: string;
  genre: string;
  listens: number;
};

type Recent = {
  id: string;
  user_id: string;
  played_at: string; // ISO
  track_id: string;
  track_name: string | null;
  artist_name: string | null;
  album_image_url: string | null;
  bpm: number | null;
  energy: number | null;
  valence: number | null;
  genre: string | null;
  preview_url: string | null;
};

const PAGE_SIZE = 20;

// ---------- small utils ----------
function toIsoOrUndef(v?: string | string[]) {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("");
}

// ---------- data fetchers (RLS does the scoping) ----------
async function fetchTopArtists() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("v_user_top_artists")
    .select("user_id,artist_id,name,image_url,listens")
    .order("listens", { ascending: false })
    .limit(5);
  // If the user isn't signed in, PostgREST may 401; just return empty so the page still renders.
  if (error) return [] as TopArtist[];
  return (data ?? []) as TopArtist[];
}

async function fetchTopGenres() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("v_user_top_genres")
    .select("user_id,genre,listens")
    .order("listens", { ascending: false })
    .limit(3);
  if (error) return [] as TopGenre[];
  return (data ?? []) as TopGenre[];
}

async function fetchRecent(beforeISO?: string) {
  const supabase = getServerSupabase();
  let q = supabase
    .from("v_recent_listens_compact")
    .select(
      "id,user_id,played_at,track_id,track_name,artist_name,album_image_url,bpm,energy,valence,genre,preview_url"
    )
    .order("played_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (beforeISO) q = q.lt("played_at", beforeISO);

  const { data, error } = await q;
  if (error) return [] as Recent[];
  return (data ?? []) as Recent[];
}

// ---------- page ----------
export default async function MusicPage({
  searchParams,
}: {
  searchParams: { before?: string };
}) {
  const before = toIsoOrUndef(searchParams?.before);

  // fetch sections in parallel (server)
  const [topArtists, topGenres, recent] = await Promise.all([
    fetchTopArtists(),
    fetchTopGenres(),
    fetchRecent(before),
  ]);

  const nextCursor = recent.length ? recent[recent.length - 1].played_at : undefined;

  // group recent plays by day for a nicer timeline
  const byDay = recent.reduce<Record<string, Recent[]>>((acc, r) => {
    (acc[dayKey(r.played_at)] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* header */}
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Music</h1>
        <div className="ml-auto text-sm opacity-70">
          {recent.length ? `Showing latest ${recent.length} plays` : "No recent plays"}
        </div>
      </header>

      {/* top blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top artists */}
        <section className="rounded-2xl border p-4">
          <h2 className="text-base font-medium mb-3">Top artists</h2>
          <ul className="space-y-3">
            {topArtists.length === 0 && <li className="text-sm opacity-70">No data yet.</li>}
            {topArtists.map((a) => (
              <li key={a.artist_id} className="flex items-center gap-3">
                {a.image_url ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-content2/50">
                    <Image src={a.image_url} alt={a.name} fill sizes="40px" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/30 grid place-items-center text-[11px] font-semibold">
                    {initials(a.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.name}</div>
                  <div className="text-xs opacity-70">{a.listens} plays</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Top genres */}
        <section className="rounded-2xl border p-4">
          <h2 className="text-base font-medium mb-3">Top genres</h2>
          <div className="flex flex-wrap gap-2">
            {topGenres.length === 0 && <div className="text-sm opacity-70">No data yet.</div>}
            {topGenres.map((g) => (
              <span key={g.genre} className="text-sm rounded-full border px-3 py-1">
                {g.genre} • {g.listens}
              </span>
            ))}
          </div>
        </section>
      </div>

      {/* Recent listens */}
      <section className="rounded-2xl border p-4">
        <h2 className="text-base font-medium mb-3">Recent listens</h2>

        {recent.length === 0 ? (
          <div className="text-sm opacity-70">No data yet. Try syncing Spotify.</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(byDay).map(([day, items]) => (
              <div key={day} className="space-y-2">
                <div className="text-xs uppercase tracking-wide opacity-60">
                  {new Date(items[0].played_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-xl bg-content2/50 p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-content2/50">
                          {r.album_image_url ? (
                            <Image
                              src={r.album_image_url}
                              alt={r.track_name ?? ""}
                              fill
                              sizes="48px"
                            />
                          ) : (
                            <div className="h-12 w-12 grid place-items-center text-[10px] font-semibold bg-gradient-to-br from-sky-500/20 to-teal-500/20 rounded-lg">
                              {initials(r.artist_name ?? "—")}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {r.track_name ?? "Unknown track"}
                          </div>
                          <div className="truncate text-xs opacity-70">
                            {r.artist_name ?? "Unknown artist"}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
                            {r.genre && <span>{r.genre}</span>}
                            {r.bpm && <span>• {Math.round(Number(r.bpm))} bpm</span>}
                          </div>
                        </div>
                      </div>
                      <time className="shrink-0 text-xs opacity-70">
                        {new Date(r.played_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Keyset pager */}
        <div className="mt-4 flex justify-center">
          {nextCursor && (
            <Link
              prefetch
              className="text-sm rounded-full border px-4 py-2 hover:bg-content2/50"
              href={`/music?before=${encodeURIComponent(nextCursor)}`}
            >
              Load older
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

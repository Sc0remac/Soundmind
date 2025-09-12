// app/music/page.tsx
import Image from "next/image";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic"; // user-scoped data

type TopArtist = { artist_id: string; name: string; image_url: string | null; listens: number };
type TopGenre  = { genre: string; listens: number };
type Recent    = {
  id: string; user_id: string; played_at: string; track_id: string;
  track_name: string | null; artist_name: string | null; album_image_url: string | null;
  genre: string | null; preview_url: string | null;
};

const PAGE_SIZE = 50;

function parseBefore(param?: string | string[]) {
  if (!param) return undefined;
  const s = Array.isArray(param) ? param[0] : param;
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

async function fetchTopArtists() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("v_user_top_artists")
    .select("artist_id,name,image_url,listens")
    .order("listens", { ascending: false })
    .limit(5);
  if (error) return [] as TopArtist[];        // unauth -> []
  return (data ?? []) as TopArtist[];
}

async function fetchTopGenres() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("v_user_top_genres")
    .select("genre,listens")
    .order("listens", { ascending: false })
    .limit(3);
  if (error) return [] as TopGenre[];
  return (data ?? []) as TopGenre[];
}

async function fetchRecent(beforeISO?: string) {
  const supabase = getServerSupabase();
  let q = supabase
    .from("v_recent_listens_compact")
    .select("id,user_id,played_at,track_id,track_name,artist_name,album_image_url,genre,preview_url")
    .order("played_at", { ascending: false })
    .limit(PAGE_SIZE);
  if (beforeISO) q = q.lt("played_at", beforeISO);
  const { data, error } = await q;
  if (error) return [] as Recent[];
  return (data ?? []) as Recent[];
}

export default async function MusicPage({ searchParams }: { searchParams?: { before?: string } }) {
  const before = parseBefore(searchParams?.before);

  const [artists, genres, recent] = await Promise.all([
    fetchTopArtists(),
    fetchTopGenres(),
    fetchRecent(before),
  ]);

  const nextCursor = recent.length ? recent[recent.length - 1].played_at : undefined;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Music</h1>
        <div className="ml-auto text-xs opacity-70">
          {recent.length ? `Showing latest ${recent.length} plays` : "No recent plays"}
        </div>
      </header>

      {/* Top tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border p-4">
          <h2 className="text-base font-medium mb-3">Top artists</h2>
          <ul className="space-y-3">
            {artists.length === 0 && <li className="text-sm opacity-70">No data yet.</li>}
            {artists.map((a) => (
              <li key={a.artist_id} className="flex items-center gap-3">
                {a.image_url ? (
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-content2/50">
                    <Image src={a.image_url} alt={a.name} fill sizes="40px" className="object-cover" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/10 grid place-items-center text-xs font-semibold">
                    {a.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{a.name}</div>
                  <div className="text-xs opacity-70">{a.listens} plays</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border p-4">
          <h2 className="text-base font-medium mb-3">Top genres</h2>
          <div className="flex flex-wrap gap-2">
            {genres.length === 0 && <div className="text-sm opacity-70">No data yet.</div>}
            {genres.map((g) => (
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
          <>
            <ul className="space-y-3">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-content2/50 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {r.album_image_url ? (
                      <Image
                        src={r.album_image_url}
                        alt=""
                        width={48}
                        height={48}
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {r.track_name ?? "Unknown track"}
                        <span className="opacity-70"> — {r.artist_name ?? "Unknown artist"}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-70">
                        {r.genre && <span>{r.genre}</span>}
                        {r.preview_url && (
                          <a href={r.preview_url} target="_blank" rel="noreferrer" className="underline">
                            Preview
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <time className="shrink-0 text-xs opacity-70">
                    {new Date(r.played_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>

            {/* Keyset pagination */}
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
          </>
        )}
      </section>
    </main>
  );
}

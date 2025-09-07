// app/api/enrich/lastfm/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * LAST.FM ENRICHMENT
 * - Looks at your most recent listens (last 100) and enriches their tracks with:
 *   - genre_primary   (string)
 *   - genre_tags      (string[])
 *   - derived_energy  (0..1)
 *   - derived_valence (0..1)
 *
 * We use last.fm track.getTopTags + artist.getTopTags.
 * No user auth: requires LASTFM_API_KEY in env.
 */

const LASTFM_KEY = process.env.LASTFM_API_KEY;

// Basic tag normalization/aliases
const TAG_ALIAS: Record<string, string> = {
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  "lo fi": "lo-fi",
  lofi: "lo-fi",
  edm: "edm",
  dnb: "drum-and-bass",
  "drum n bass": "drum-and-bass",
  "drum & bass": "drum-and-bass",
  house: "house",
  techno: "techno",
  trance: "trance",
  ambient: "ambient",
  chill: "chill",
  "chill out": "chill",
  rock: "rock",
  metal: "metal",
  pop: "pop",
  trap: "trap",
  dance: "dance",
  "r&b": "rnb",
  rnb: "rnb",
};

// Heuristic maps for deriving energy/valence from tags.
// NOTE: keys with hyphens MUST be quoted in TS.
const TAG_TO_ENERGY: Record<string, number> = {
  rave: 0.9,
  hardstyle: 0.95,
  edm: 0.8,
  dance: 0.7,
  rock: 0.7,
  techno: 0.8,
  house: 0.7,
  chill: 0.2,
  ambient: 0.1,
  acoustic: 0.2,
  downtempo: 0.3,
  "lo-fi": 0.25,
  lofi: 0.25,
  pop: 0.6,
  hiphop: 0.6,
  "hip-hop": 0.6,
  trap: 0.7,
  metal: 0.85,
  trance: 0.75,
  "drum-and-bass": 0.85,
};

const TAG_TO_VALENCE: Record<string, number> = {
  happy: 0.9,
  upbeat: 0.8,
  uplifting: 0.8,
  melancholic: 0.2,
  sad: 0.1,
  dark: 0.2,
  chill: 0.6,
  ambient: 0.5,
  acoustic: 0.7,
  pop: 0.7,
  "hip-hop": 0.6,
  hiphop: 0.6,
  trap: 0.5,
  techno: 0.4,
  metal: 0.3,
  trance: 0.6,
};

// Useful stopwords we don’t want as “genres”
const TAG_STOP = new Set([
  "seen live",
  "favorites",
  "favorite",
  "awesome",
  "90s",
  "00s",
  "2010s",
  "2020s",
  "uk",
  "usa",
  "british",
  "swedish",
  "german",
  "female vocalists",
  "male vocalists",
]);

type LastfmTag = { name: string; count?: number };

function normalizeTag(t: string): string {
  const s = t.trim().toLowerCase();
  const clean = s.replace(/\s+/g, " "); // collapse spaces
  const alias = TAG_ALIAS[clean] || clean;
  // strip non-word characters except space and hyphen
  return alias.replace(/[^\w\s-]/g, "").trim();
}

function scoreTags(tags: LastfmTag[]) {
  // Return cleaned, weighted tag list and top candidates for genre_primary
  const map = new Map<string, number>();
  for (const tag of tags || []) {
    if (!tag?.name) continue;
    let n = normalizeTag(tag.name);
    if (!n || TAG_STOP.has(n)) continue;
    const w = Math.max(1, Number(tag.count || 1));
    map.set(n, (map.get(n) || 0) + w);
  }
  // sort by weight desc
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const ordered = entries.map(([k]) => k);
  const top = entries.length > 0 ? entries[0][0] : null;
  return { ordered, top };
}

function deriveEnergyValence(tags: string[]) {
  if (!tags?.length) return { energy: null as number | null, valence: null as number | null };
  let eSum = 0,
    eN = 0,
    vSum = 0,
    vN = 0;
  for (const t of tags) {
    if (t in TAG_TO_ENERGY) {
      eSum += TAG_TO_ENERGY[t];
      eN++;
    }
    if (t in TAG_TO_VALENCE) {
      vSum += TAG_TO_VALENCE[t];
      vN++;
    }
  }
  return {
    energy: eN ? Number((eSum / eN).toFixed(3)) : null,
    valence: vN ? Number((vSum / vN).toFixed(3)) : null,
  };
}

async function lf(method: string, params: Record<string, string>) {
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", String(LASTFM_KEY));
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!r.ok) throw new Error(`Last.fm ${method} ${r.status}`);
  return r.json();
}

async function fetchTagsFor(artist: string, track: string): Promise<LastfmTag[]> {
  const tags: LastfmTag[] = [];
  try {
    const jt = await lf("track.getTopTags", {
      artist,
      track,
      autocorrect: "1",
    });
    if (jt?.toptags?.tag?.length) tags.push(...jt.toptags.tag);
  } catch {
    // ignore
  }
  // If nothing from track, try artist
  if (tags.length === 0) {
    try {
      const ja = await lf("artist.getTopTags", { artist, autocorrect: "1" });
      if (ja?.toptags?.tag?.length) tags.push(...ja.toptags.tag);
    } catch {
      // ignore
    }
  }
  return tags;
}

type TrackRow = {
  id: string;
  name: string;
  genre_primary?: string | null;
  genre_tags?: string[] | null;
  artist_name?: string | null;
};

type LinkRow = { track_id: string; artist_id: string };
type ArtistRow = { id: string; name: string };

export async function POST() {
  if (!LASTFM_KEY) {
    return NextResponse.json(
      { ok: false, error: "Missing LASTFM_API_KEY" },
      { status: 500 }
    );
  }

  // 1) Find up to 100 tracks that lack genre metadata
  const { data: tracks, error: tErr } = await supabaseAdmin
    .from("spotify_tracks")
    .select("id,name,genre_primary,genre_tags,artist_name")
    .or("genre_primary.is.null,genre_tags.is.null")
    .limit(100);
  if (tErr) return NextResponse.json({ ok: false, error: tErr.message }, { status: 500 });
  const trackRows = tracks as TrackRow[] | null;
  if (!trackRows?.length)
    return NextResponse.json({ ok: true, updated: 0, processed: 0, note: "No tracks need tags" });

  const ids = trackRows.map((t) => t.id);

  // 2) Fetch track-artist links and artist names
  const [{ data: links }, { data: artists }] = await Promise.all([
    supabaseAdmin.from("spotify_track_artists").select("track_id,artist_id").in("track_id", ids),
    supabaseAdmin.from("spotify_artists").select("id,name"),
  ] as const);

  const artistMap = new Map<string, string>();
  (artists as ArtistRow[] | null | undefined)?.forEach((a) => artistMap.set(a.id, a.name));

  const trackArtists = new Map<string, string[]>();
  (links as LinkRow[] | null | undefined)?.forEach((lnk) => {
    const arr = trackArtists.get(lnk.track_id) || [];
    const nm = artistMap.get(lnk.artist_id);
    if (nm) arr.push(nm);
    trackArtists.set(lnk.track_id, arr);
  });

  // 3) For each track, call last.fm and update the row
  let updated = 0;
  const results: any[] = [];

  for (const tr of trackRows) {
    let artistsForTrack = trackArtists.get(tr.id) || [];
    if ((!artistsForTrack || artistsForTrack.length === 0) && tr.artist_name) {
      artistsForTrack = String(tr.artist_name)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const artist = artistsForTrack[0] || ""; // pick the first (primary) artist
    if (!artist || !tr.name) continue;

    const tags = await fetchTagsFor(artist, tr.name);
    const { ordered, top } = scoreTags(tags);
    const { energy, valence } = deriveEnergyValence(ordered);

    const genre_primary = top || tr.genre_primary || null;
    const genre_tags = ordered.slice(0, 8);

    const { error: uErr } = await supabaseAdmin
      .from("spotify_tracks")
      .update({
        genre_primary,
        genre_tags: genre_tags.length ? genre_tags : null,
        derived_energy: energy,
        derived_valence: valence,
        last_enriched_at: new Date().toISOString(),
        meta_provider: {
          ...(typeof (tr as any).meta_provider === "object" ? (tr as any).meta_provider : {}),
          lastfm: { ok: true, tagsFetched: tags.length, artist, track: tr.name },
        },
      })
      .eq("id", tr.id);

    results.push({
      id: tr.id,
      track: tr.name,
      artist,
      topTag: genre_primary,
      tagCount: tags.length,
      updated: !uErr,
      error: uErr?.message || null,
    });

    if (!uErr) updated++;
    // Small delay to be polite to Last.fm
    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ ok: true, updated, processed: tracks?.length || 0, results });
}

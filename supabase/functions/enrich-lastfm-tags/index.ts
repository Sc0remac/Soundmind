// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;
const LASTFM_KEY = Deno.env.get("LASTFM_API_KEY");

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
const TAG_TO_ENERGY: Record<string, number> = {
  rave: 0.9, hardstyle: 0.95, edm: 0.8, dance: 0.7, rock: 0.7, techno: 0.8, house: 0.7,
  chill: 0.2, ambient: 0.1, acoustic: 0.2, downtempo: 0.3, "lo-fi": 0.25, lofi: 0.25,
  pop: 0.6, hiphop: 0.6, "hip-hop": 0.6, trap: 0.7, metal: 0.85, trance: 0.75, "drum-and-bass": 0.85,
};
const TAG_TO_VALENCE: Record<string, number> = {
  happy: 0.9, upbeat: 0.8, uplifting: 0.8, melancholic: 0.2, sad: 0.1, dark: 0.2,
  chill: 0.6, ambient: 0.5, acoustic: 0.7, pop: 0.7, "hip-hop": 0.6, hiphop: 0.6, trap: 0.5, techno: 0.4, metal: 0.3, trance: 0.6,
};
const TAG_STOP = new Set(["seen live","favorites","favorite","awesome","90s","00s","2010s","2020s","uk","usa","british","swedish","german","female vocalists","male vocalists"]);

function normalizeTag(t: string): string {
  const s = t.trim().toLowerCase();
  const clean = s.replace(/\s+/g, " ");
  const alias = TAG_ALIAS[clean] || clean;
  return alias.replace(/[^\w\s-]/g, "").trim();
}
function scoreTags(tags: { name: string; count?: number }[]) {
  const map = new Map<string, number>();
  for (const tag of tags || []) {
    if (!tag?.name) continue;
    const n = normalizeTag(tag.name);
    if (!n || TAG_STOP.has(n)) continue;
    const w = Math.max(1, Number(tag.count || 1));
    map.set(n, (map.get(n) || 0) + w);
  }
  const ordered = [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const top = ordered[0] || null;
  const energy = (() => { const vals = ordered.map((t) => TAG_TO_ENERGY[t]).filter((v) => typeof v === "number"); return vals.length ? Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null; })();
  const valence = (() => { const vals = ordered.map((t) => TAG_TO_VALENCE[t]).filter((v) => typeof v === "number"); return vals.length ? Number((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)) : null; })();
  return { ordered, top, energy, valence };
}

async function lf(method: string, params: Record<string, string>) {
  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", method);
  url.searchParams.set("api_key", String(LASTFM_KEY));
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error(`Last.fm ${method} ${r.status}`);
  return r.json();
}
async function fetchTagsFor(artist: string, track: string) {
  const tags: any[] = [];
  try { const jt = await lf("track.getTopTags", { artist, track, autocorrect: "1" }); if (jt?.toptags?.tag?.length) tags.push(...jt.toptags.tag); } catch {}
  if (!tags.length) { try { const ja = await lf("artist.getTopTags", { artist, autocorrect: "1" }); if (ja?.toptags?.tag?.length) tags.push(...ja.toptags.tag); } catch {} }
  return tags as { name: string; count?: number }[];
}

serve(async () => {
  try {
    if (!LASTFM_KEY) return new Response(JSON.stringify({ ok: false, error: "Missing LASTFM_API_KEY" }), { status: 500 });
    const admin = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: tracks, error: tErr } = await admin
      .from("spotify_tracks")
      .select("id,name,genre_primary,genre_tags,artist_name")
      .or("genre_primary.is.null,genre_tags.is.null")
      .limit(100);
    if (tErr) return new Response(JSON.stringify({ ok: false, error: tErr.message }), { status: 500 });
    const rows = (tracks || []) as any[];
    if (!rows.length) return new Response(JSON.stringify({ ok: true, updated: 0, processed: 0, note: "No tracks need tags" }), { headers: { "Content-Type": "application/json" } });

    // Fetch links and artist names
    const ids = rows.map((t) => t.id);
    const [{ data: links }, { data: artists }] = await Promise.all([
      admin.from("spotify_track_artists").select("track_id,artist_id").in("track_id", ids),
      admin.from("spotify_artists").select("id,name"),
    ] as const);
    const byArtistId = new Map<string, string>();
    (artists || []).forEach((a: any) => byArtistId.set(a.id, a.name));
    const trackArtists = new Map<string, string[]>();
    (links || []).forEach((lnk: any) => {
      const arr = trackArtists.get(lnk.track_id) || [];
      const nm = byArtistId.get(lnk.artist_id);
      if (nm) arr.push(nm);
      trackArtists.set(lnk.track_id, arr);
    });

    let updated = 0;
    const results: any[] = [];
    for (const tr of rows) {
      let artistsForTrack = trackArtists.get(tr.id) || [];
      if ((!artistsForTrack || artistsForTrack.length === 0) && tr.artist_name) {
        artistsForTrack = String(tr.artist_name).split(",").map((s) => s.trim()).filter(Boolean);
      }
      const artist = artistsForTrack[0] || "";
      if (!artist || !tr.name) continue;

      const tags = await fetchTagsFor(artist, tr.name);
      const { ordered, top, energy, valence } = scoreTags(tags);

      const genre_primary = top || tr.genre_primary || null;
      const genre_tags = ordered.slice(0, 8);
      const { error: uErr } = await admin
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

      results.push({ id: tr.id, track: tr.name, artist, topTag: genre_primary, tagCount: tags.length, updated: !uErr, error: uErr?.message || null });
      if (!uErr) updated++;
      await new Promise((r) => setTimeout(r, 120));
    }

    return new Response(JSON.stringify({ ok: true, updated, processed: rows.length, results }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});

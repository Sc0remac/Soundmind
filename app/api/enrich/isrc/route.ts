    // app/api/enrich/isrc/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseServer";
import { requireUserFromRequest } from "@/lib/auth";
import { buildTrackArtistMaps, mergeArtistImages } from "./helpers";



async function getUserAccessToken(userId: string, forceRefresh = false) {
  const { data, error } = await supabaseAdmin
    .from("spotify_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();




async function fetchTracksBatch(token: string, ids: string[]) {
  const url = new URL("https://api.spotify.com/v1/tracks");
  url.searchParams.set("ids", ids.join(","));
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Spotify /v1/tracks ${r.status}: ${txt}`);
  }
  return r.json() as Promise<{
    tracks: Array<{
      id: string;
      name: string;
      explicit: boolean;
      duration_ms: number;
      preview_url: string | null;
      external_ids?: { isrc?: string };
      album?: { name?: string; images?: Array<{ url: string }> };
      artists?: Array<{ id: string; name: string }>;
    }>;
  }>;
}

async function fetchArtistsBatch(token: string, ids: string[]) {
  const url = new URL("https://api.spotify.com/v1/artists");
  url.searchParams.set("ids", ids.join(","));
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Spotify /v1/artists ${r.status}: ${txt}`);
  }
  return r.json() as Promise<{
    artists: Array<{ id: string; images?: Array<{ url: string }> }>;
  }>;
}

// Row-building helpers shared with tests

export async function POST(req: Request) {
  try {
    if (!usingServiceRole) {
      return NextResponse.json(
        { ok: false, error: "Missing service role" },
        { status: 500 }
      );
    }

    // 1) Ensure user
    const user = await requireUserFromRequest(req);
    const userId = user.id;

    // 2) Find recent track IDs
    const { data: listens, error: lErr } = await supabaseAdmin
      .from("spotify_listens")
      .select("track_id")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(200);

    if (lErr) throw new Error(lErr.message);

    const recentIds = Array.from(
      new Set(
        (listens as { track_id: string }[] | null | undefined)?.map((r) => r.track_id) ||
          []
      )
    );

    // 3) Figure out which tracks need enrichment
    const { data: existing, error: eErr } = await supabaseAdmin
      .from("spotify_tracks")
      .select("id,isrc")
      .in("id", recentIds);

    if (eErr) throw new Error(eErr.message);

    const needLookup = recentIds.filter(
      (id) => !existing?.find((row) => row.id === id && row.isrc)
    );

    if (needLookup.length === 0) {
      return NextResponse.json({
        ok: true,
        looked_up: 0,
        updated: 0,
        note: "All recent tracks already have ISRC",
      });
    }

    let token = await getUserAccessToken(userId);

    // 4) Fetch in chunks of 50 and upsert
    let looked = 0;
    let updated = 0;

    for (let i = 0; i < needLookup.length; i += 50) {
      const slice = needLookup.slice(i, i + 50);
      let j;
      try {
        j = await fetchTracksBatch(token, slice);
      } catch (e: any) {
        if (String(e).includes("401")) {
          token = await getUserAccessToken(userId, true);
          j = await fetchTracksBatch(token, slice);
        } else {
          throw e;
        }
      }
      looked += slice.length;

      const { trackMap, artistMap, linkRows } = buildTrackArtistMaps(j.tracks || []);

      const artistIds = Array.from(artistMap.keys());
      if (artistIds.length) {
        let art;
        try {
          art = await fetchArtistsBatch(token, artistIds);
        } catch (e: any) {
          if (String(e).includes("401")) {
            token = await getUserAccessToken(userId, true);
            art = await fetchArtistsBatch(token, artistIds);
          } else {
            throw e;
          }
        }
        mergeArtistImages(artistMap, art.artists || []);
      }

      const trackRows = Array.from(trackMap.values());
      const artistRows = Array.from(artistMap.values());

      if (trackRows.length) {
        const { error: uErr, count } = await supabaseAdmin
          .from("spotify_tracks")
          .upsert(trackRows, { onConflict: "id", ignoreDuplicates: false, count: "exact" });
        if (uErr) throw new Error(uErr.message);
        updated += count || 0;
      }

      if (artistRows.length) {
        const { error: arErr } = await supabaseAdmin
          .from("spotify_artists")
          .upsert(artistRows, { onConflict: "id" });
        if (arErr) throw new Error(arErr.message);
      }

      if (linkRows.length) {
        const { error: lnErr } = await supabaseAdmin
          .from("spotify_track_artists")
          .upsert(linkRows, { onConflict: "track_id,artist_id" });
        if (lnErr) throw new Error(lnErr.message);
      }
    }

    return NextResponse.json({ ok: true, looked_up: looked, updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

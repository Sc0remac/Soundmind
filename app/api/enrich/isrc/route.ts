// app/api/enrich/isrc/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin, usingServiceRole } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";
import { buildTrackArtistMaps, mergeArtistImages } from "./helpers";
import { fetchSpotifyArtists } from "@/lib/spotify";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  });
  const basic = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Spotify refresh failed (${r.status}): ${txt}`);
  }
  return r.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function getUserAccessToken(userId: string, forceRefresh = false) {
  const { data, error } = await supabaseAdmin
    .from("spotify_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Spotify not connected");

  let { access_token, refresh_token, expires_at } = data as any;
  const willExpire =
    forceRefresh ||
    (typeof expires_at === "number" ? Date.now() / 1000 > expires_at - 60 : true);

  if (!access_token || willExpire) {
    if (!refresh_token) throw new Error("Missing Spotify refresh token");
    const j = await refreshAccessToken(refresh_token);
    access_token = j.access_token;
    const newExpiresAt = Math.floor(Date.now() / 1000) + Number(j.expires_in || 3600);

    await supabaseAdmin
      .from("spotify_accounts")
      .update({ access_token, expires_at: newExpiresAt })
      .eq("user_id", userId);
  }
  return access_token as string;
}

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

// Fetch artists in chunks of 50 to satisfy Spotify limits
async function fetchArtistsBatch(token: string, ids: string[]) {
  const out: { artists: Array<{ id: string; images?: Array<{ url: string }> }> } = {
    artists: [],
  };
  for (let i = 0; i < ids.length; i += 50) {
    const slice = ids.slice(i, i + 50);
    const j = await fetchSpotifyArtists(token, slice);
    out.artists.push(...(j?.artists || []));
    // small delay to be polite
    if (i + 50 < ids.length) await new Promise((r) => setTimeout(r, 60));
  }
  return out;
}

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

    // 2) Find recent track IDs (we’ll enrich these)
    const { data: listens, error: lErr } = await supabaseAdmin
      .from("spotify_listens")
      .select("track_id")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(200);

    if (lErr) throw new Error(lErr.message);
    const recentIds = Array.from(
      new Set(
        (listens as { track_id: string }[] | null | undefined)?.map((r) => r.track_id) || []
      )
    );
    if (recentIds.length === 0) {
      return NextResponse.json({
        ok: true,
        looked_up: 0,
        updated: 0,
        note: "No recent listens",
      });
    }

    // 3) Load existing tracks to see which are missing ISRC/fields
    const { data: tracks } = await supabaseAdmin
      .from("spotify_tracks")
      .select("id, isrc, preview_url, name")
      .in("id", recentIds);

    const existing = new Map(
      (
        tracks as {
          id: string;
          isrc: string | null;
          preview_url: string | null;
          name: string | null;
        }[] | null | undefined
      )?.map((t) => [t.id, t]) || []
    );
    const needLookup = recentIds.filter((id) => {
      const row = existing.get(id);
      // fetch if missing ISRC OR preview_url OR (edge) no row at all
      return !row || !row.isrc || row.preview_url == null || !row.name;
    });

    if (needLookup.length === 0) {
      return NextResponse.json({
        ok: true,
        looked_up: 0,
        updated: 0,
        note: "All recent tracks already have ISRC",
      });
    }

    let token = await getUserAccessToken(userId);

    // 4) Fetch in chunks of 50 and upsert full rows
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

      // small delay to be nice
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({ ok: true, looked_up: looked, updated });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

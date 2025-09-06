// app/api/enrich/isrc/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUserFromRequest } from "@/lib/auth";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

async function refreshAccessToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  });
  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
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

async function getUserAccessToken(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("spotify_accounts")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) throw new Error("Spotify not connected");

  let { access_token, refresh_token, expires_at } = data;
  const willExpire = typeof expires_at === "number" ? Date.now() / 1000 > expires_at - 60 : false;

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
    }>;
  }>;
}

export async function POST(req: Request) {
  try {
    // 1) Ensure user
    const auth = await requireUserFromRequest(req);
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
    const userId = auth.userId;

    // 2) Find recent track IDs (we’ll enrich these)
    const { data: listens, error: lErr } = await supabaseAdmin
      .from("spotify_listens")
      .select("track_id")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(200);

    if (lErr) throw new Error(lErr.message);
    const recentIds = Array.from(new Set((listens || []).map((r) => r.track_id)));
    if (recentIds.length === 0) {
      return NextResponse.json({ ok: true, looked_up: 0, updated: 0, note: "No recent listens" });
    }

    // 3) Load existing tracks to see which are missing ISRC/fields
    const { data: tracks } = await supabaseAdmin
      .from("spotify_tracks")
      .select("id, isrc, preview_url, name")
      .in("id", recentIds);

    const existing = new Map(tracks?.map((t) => [t.id, t]) || []);
    const needLookup = recentIds.filter((id) => {
      const row = existing.get(id);
      // fetch if missing ISRC OR preview_url OR (edge) no row at all
      return !row || !row.isrc || row.preview_url == null || !row.name;
    });

    if (needLookup.length === 0) {
      return NextResponse.json({ ok: true, looked_up: 0, updated: 0, note: "All recent tracks already have ISRC" });
    }

    const token = await getUserAccessToken(userId);

    // 4) Fetch in chunks of 50 and upsert full rows
    let looked = 0;
    let updated = 0;

    for (let i = 0; i < needLookup.length; i += 50) {
      const slice = needLookup.slice(i, i + 50);
      const j = await fetchTracksBatch(token, slice);
      looked += slice.length;

      const upserts = (j.tracks || []).map((t) => {
        const albumImg = t.album?.images?.[0]?.url || null;
        const albumName = t.album?.name || null;
        return {
          id: t.id,
          name: t.name || "(unknown)", // NEVER null; protects NOT NULL constraint
          album_name: albumName,
          image_url: albumImg,
          preview_url: t.preview_url ?? null,
          duration_ms: t.duration_ms ?? null,
          explicit: typeof t.explicit === "boolean" ? t.explicit : null,
          isrc: t.external_ids?.isrc || null,
          meta_provider: {
            spotify_track: true,
          },
        };
      });

      if (upserts.length) {
        const { error: uErr, count } = await supabaseAdmin
          .from("spotify_tracks")
          .upsert(upserts, { onConflict: "id", ignoreDuplicates: false, count: "exact" });
        if (uErr) throw new Error(uErr.message);
        updated += count || 0;
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

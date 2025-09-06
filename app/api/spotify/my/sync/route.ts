// /app/api/spotify/my/sync/route.ts
import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth";
import { fetchRecentlyPlayed, getAccountForUser, refreshToken, upsertAccount } from "@/lib/spotify";
import { supabaseService } from "@/lib/supabaseServer";

/** Normalize the Spotify item -> row payloads */
function normalize(items: any[]) {
  return items.map((it) => {
    const t = it.track;
    const artists = Array.isArray(t?.artists) ? t.artists.map((a: any) => a.name).join(", ") : null;
    const image = t?.album?.images?.[0]?.url || null;
    return {
      track_id: t?.id,
      track_name: t?.name || null,
      artist_name: artists,
      album_name: t?.album?.name || null,
      album_image_url: image,
      played_at: new Date(it.played_at).toISOString(),
      isrc: t?.external_ids?.isrc || null,
      preview_url: t?.preview_url || null,
    };
  }).filter((r) => !!r.track_id && !!r.played_at);
}

export async function POST(req: Request) {
  const { user } = await requireUserFromRequest(req);
  const url = new URL(req.url);
  const full = url.searchParams.has("full");

  const admin = supabaseService();
  let acct = await getAccountForUser(user.id);
  if (!acct) return NextResponse.json({ ok: true, items_received: 0, imported: 0, note: "No account" });

  // Refresh if expired
  if (!acct.expires_at || new Date(acct.expires_at).getTime() <= Date.now() + 30_000) {
    const rt = acct.refresh_token;
    if (rt) {
      const freshed = await refreshToken(rt);
      const expires_at = new Date(Date.now() + (freshed.expires_in - 60) * 1000).toISOString();
      await upsertAccount(user.id, {
        access_token: freshed.access_token,
        refresh_token: freshed.refresh_token || rt,
        scope: freshed.scope || acct.scope,
        expires_at,
      });
      acct = await getAccountForUser(user.id);
    }
  }

  // Fetch plays
  const after = full ? undefined : acct.cursor_after_ms || undefined;
  const json = await fetchRecentlyPlayed(acct.access_token, after);
  const rows = normalize(json.items);

  // Upsert tracks, then listens
  let imported = 0;
  if (rows.length) {
    const tracks = rows.map((r) => ({
      id: r.track_id,
      name: r.track_name || "Unknown",
      artist_name: r.artist_name,
      album_name: r.album_name,
      image_url: r.album_image_url,
      isrc: r.isrc,
      preview_url: r.preview_url,
      updated_at: new Date().toISOString(),
    }));

    await admin.from("spotify_tracks").upsert(tracks);

    const listens = rows.map((r) => ({
      user_id: user.id,
      track_id: r.track_id,
      played_at: r.played_at,
    }));

    const { error } = await admin
      .from("spotify_listens")
      .upsert(listens, { onConflict: "user_id,track_id,played_at", ignoreDuplicates: true });
    if (error && !String(error.message).includes("duplicate key")) throw error;

    imported = rows.length;
    const newest = Math.max(...rows.map((r) => new Date(r.played_at).getTime()));
    await upsertAccount(user.id, { cursor_after_ms: newest + 1 });
  }

  return NextResponse.json({
    ok: true,
    items_received: rows.length,
    imported,
    used_after: !!after,
  });
}

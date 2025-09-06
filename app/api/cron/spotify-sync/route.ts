import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ensureValidAccessToken,
  fetchJson,
  upsertArtistsAndTracks,
  fetchAndUpsertArtistDetails,
  fetchAndUpsertAudioFeatures,
} from "@/lib/spotify";

export const revalidate = 0;

export async function GET() {
  const { data: accounts } = await supabaseAdmin
    .from("spotify_accounts")
    .select("user_id, last_after_cursor_ms")
    .limit(2000);

  let totalImported = 0;

  for (const acc of accounts || []) {
    try {
      const access = await ensureValidAccessToken(acc.user_id as string);
      if (!access) continue;

      const afterParam = acc.last_after_cursor_ms ? `&after=${acc.last_after_cursor_ms}` : "";
      const url = `https://api.spotify.com/v1/me/player/recently-played?limit=50${afterParam}`;
      const json = await fetchJson<any>(url, access as string);
      const items: any[] = Array.isArray(json?.items) ? (json.items as any[]) : [];
      if (!items.length) continue;

      await upsertArtistsAndTracks(items);

      const trackIds = Array.from(
        new Set(items.map((i: any) => i?.track?.id).filter(Boolean))
      ) as string[];
      const artistIds = Array.from(
        new Set(items.flatMap((i: any) => (i?.track?.artists || []).map((a: any) => a.id)).filter(Boolean))
      ) as string[];

      await fetchAndUpsertArtistDetails(access as string, artistIds);
      await fetchAndUpsertAudioFeatures(access as string, trackIds);

      const listenRows = items.map((i: any) => ({
        user_id: acc.user_id as string,
        track_id: i.track.id as string,
        played_at: new Date(i.played_at).toISOString(),
        context_uri: i.context?.uri ?? null,
        source: "recently_played",
      }));
      for (let i = 0; i < listenRows.length; i += 500) {
        await supabaseAdmin.from("spotify_listens").upsert(listenRows.slice(i, i + 500), { ignoreDuplicates: true });
      }

      const newest = items.reduce((max: number, it: any) => Math.max(max, new Date(it.played_at).getTime()), 0);
      await supabaseAdmin
        .from("spotify_accounts")
        .update({
          last_recent_sync_at: new Date().toISOString(),
          last_after_cursor_ms: newest ? newest + 1 : null,
        })
        .eq("user_id", acc.user_id);

      await supabaseAdmin
        .from("profiles")
        .update({ spotify_last_sync_at: new Date().toISOString() })
        .eq("id", acc.user_id);

      totalImported += listenRows.length;
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      continue;
    }
  }

  return NextResponse.json({ ok: true, imported: totalImported });
}

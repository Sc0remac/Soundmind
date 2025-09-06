import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.user.id;

  const { data, error } = await supabaseServer
    .from("v_spotify_listens_expanded")
    .select("*")
    .eq("user_id", userId)
    .order("played_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []).map((r: any) => ({
    id: `${r.user_id}:${r.track_id}:${r.played_at}`,
    track_id: r.track_id,
    played_at: r.played_at,
    track_name: r.track_name,
    artist_name: r.artist_name ?? null,
    album_image_url: r.album_image_url ?? null,
    bpm: r.tempo ?? null,
    energy: r.energy ?? null,
    valence: r.valence ?? null,
    genre: r.genre_primary ?? (Array.isArray(r.genre_tags) && r.genre_tags[0]) ?? null,
  }));

  return NextResponse.json({ rows });
}

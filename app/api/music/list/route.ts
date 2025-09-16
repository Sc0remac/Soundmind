/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/music/list/route.ts
import { NextResponse } from "next/server";
import { requireUserFromRequest, supabaseFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);
    const { supa } = supabaseFromRequest(req);

    // Use view if present, else join at runtime
    const { data: rows, error } = await supa
      .from("v_spotify_listens_expanded")
      .select("*")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);
    return NextResponse.json({ rows: rows ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 401 });
  }
}
/* eslint-disable @typescript-eslint/no-explicit-any */

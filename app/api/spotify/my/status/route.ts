// app/api/spotify/my/status/route.ts
import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const user = await requireUserFromRequest(req);

    const { data, error } = await supabaseAdmin
      .from("spotify_accounts")
      .select("user_id, last_recent_sync_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      connected: !!data,
      last_sync: data?.last_recent_sync_at || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 401 });
  }
}

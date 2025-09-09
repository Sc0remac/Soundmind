import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const user = await requireUserFromRequest(req);

    await supabaseAdmin.from("spotify_accounts").delete().eq("user_id", user.id);
    await supabaseAdmin
      .from("profiles")
      .update({
        spotify_connected: false,
        spotify_user_id: null,
        spotify_scopes: null,
        spotify_last_sync_at: null,
      })
      .eq("id", user.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

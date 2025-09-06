import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUserFromRequest } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Idempotent attach:
 * - If raw cookies from /callback exist -> upsert tokens, clear raw cookies.
 * - If raw cookies missing but an account row already exists -> 200 OK.
 * - Otherwise -> 400 with message.
 */
export async function POST(req: Request) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.user;

  const c = cookies();
  const access = c.get("sp_raw_access")?.value || "";
  const refresh = c.get("sp_raw_refresh")?.value || "";
  const scope = c.get("sp_scope_tmp")?.value || "";
  const expiresIn = Number(c.get("sp_expires_in_tmp")?.value || "3600");
  const spotifyUserId = c.get("sp_user_tmp")?.value || null;

  // If already attached, consider success.
  const { data: existing } = await supabaseServer
    .from("spotify_accounts")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!access) {
    if (existing) {
      return NextResponse.json({ ok: true, note: "Already attached" });
    }
    return NextResponse.json({ error: "Missing OAuth tokens" }, { status: 400 });
  }

  const expires_at = Math.floor(Date.now() / 1000) + (expiresIn || 3600);

  const { error } = await supabaseServer.from("spotify_accounts").upsert({
    user_id: user.id,
    spotify_user_id: spotifyUserId,
    access_token: access,
    refresh_token: refresh,
    scope,
    expires_at,
    connected_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseServer
    .from("profiles")
    .update({
      spotify_connected: true,
      spotify_user_id: spotifyUserId,
      spotify_scopes: scope ? scope.split(" ") : [],
      spotify_last_sync_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  // Clear raw cookies once successfully stored
  c.delete("sp_raw_access");
  c.delete("sp_raw_refresh");

  return NextResponse.json({ ok: true });
}

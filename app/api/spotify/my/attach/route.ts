import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUserFromRequest } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabaseServer";

function parseScopes(scope: string | null): string[] {
  if (!scope) return [];
  return scope.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  const auth = await requireUserFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.user;

  const c = cookies();
  const access = c.get("sp_raw_access")?.value || "";
  const refresh = c.get("sp_raw_refresh")?.value || "";
  const scopeRaw = c.get("sp_scope_tmp")?.value || "";
  const expiresIn = Number(c.get("sp_expires_in_tmp")?.value || "3600");
  const spotifyUserId = c.get("sp_user_tmp")?.value || null;

  // If no cookies but account exists, accept (idempotent attach)
  const existing = await supabaseServer
    .from("spotify_accounts")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!access) {
    if (existing.data) {
      await supabaseServer.from("profiles").update({ spotify_connected: true }).eq("id", user.id);
      return NextResponse.json({ ok: true, note: "Already attached" });
    }
    return NextResponse.json({ error: "Missing OAuth tokens" }, { status: 400 });
  }

  const expires_at = Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600);

  // Upsert token bundle (scope stored as text)
  const up1 = await supabaseServer.from("spotify_accounts").upsert({
    user_id: user.id,
    spotify_user_id: spotifyUserId,
    access_token: access,
    refresh_token: refresh,
    scope: scopeRaw,
    expires_at,
    connected_at: new Date().toISOString()
  });
  if (up1.error) {
    const msg = up1.error.message || "attach failed";
    // Retry without connected_at if schema cache/type glitch
    if (/connected_at|schema cache|date\/time field value/i.test(msg)) {
      const up2 = await supabaseServer.from("spotify_accounts").upsert({
        user_id: user.id,
        spotify_user_id: spotifyUserId,
        access_token: access,
        refresh_token: refresh,
        scope: scopeRaw,
        expires_at
      });
      if (up2.error) {
        return NextResponse.json({ error: up2.error.message || "attach failed (retry)" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Update profile flags (TRY array first, then FALLBACK to text only; never fail the whole attach)
  const scopesArr = parseScopes(scopeRaw);

  const p1 = await supabaseServer.from("profiles")
    .update({
      spotify_connected: true,
      spotify_user_id: spotifyUserId,
      spotify_scopes: scopesArr,          // text[]
      spotify_scope_str: scopeRaw || null,
      spotify_last_sync_at: new Date().toISOString()
    })
    .eq("id", user.id);

  if (p1.error) {
    const msg = p1.error.message || "";
    // If array write fails for any reason, fall back to text-only write
    const p2 = await supabaseServer.from("profiles")
      .update({
        spotify_connected: true,
        spotify_user_id: spotifyUserId,
        spotify_scope_str: scopeRaw || null,
        spotify_last_sync_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (p2.error) {
      return NextResponse.json({ error: p2.error.message || `profile update failed: ${msg}` }, { status: 400 });
    }
  }

  // Clear raw cookies after persisting
  c.delete("sp_raw_access");
  c.delete("sp_raw_refresh");

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

function getBearer(): string | null {
  const h = headers();
  const a = h.get("authorization") || h.get("Authorization") || "";
  const m = a.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
const toScopeArray = (s: string | null) =>
  (s || "").split(/\s+/).map(x => x.trim()).filter(Boolean);

export async function POST() {
  try {
    const c = cookies();
    const access = c.get("sp_access_token_tmp")?.value || null;
    const refresh = c.get("sp_refresh_token_tmp")?.value || null;
    const expIn = Number(c.get("sp_expires_in_tmp")?.value || "0");
    const scopeStr = c.get("sp_scope_tmp")?.value || "";
    let spUser = c.get("sp_user_tmp")?.value || "";

    if (!access || !refresh || !expIn) {
      return NextResponse.json({ error: "Missing temporary OAuth cookies" }, { status: 400 });
    }

    // If we didn't manage to store user id during callback, fetch it now.
    if (!spUser) {
      const meRes = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${access}` }
      });
      if (meRes.status === 401) {
        // Token not valid; clear cookies to force a clean re-auth
        ["sp_access_token_tmp","sp_refresh_token_tmp","sp_expires_in_tmp","sp_scope_tmp","sp_user_tmp"]
          .forEach((n) => c.set(n, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 }));
        return NextResponse.json({ error: "Spotify token invalid; please reconnect." }, { status: 401 });
      }
      const me = await meRes.json().catch(() => ({}));
      spUser = me?.id || "";
    }

    const jwt = getBearer();
    if (!jwt) return NextResponse.json({ error: "Missing bearer" }, { status: 401 });

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      }
    );

    const { data: u, error: uErr } = await supa.auth.getUser();
    if (uErr || !u?.user) return NextResponse.json({ error: uErr?.message || "No user" }, { status: 401 });
    const uid = u.user.id;

    const scopes = toScopeArray(scopeStr);
    const expiresAt = new Date(Date.now() + Math.max(0, expIn - 60) * 1000);

    // Store account (RLS: own row)
    const { error: upErr } = await supa
      .from("spotify_accounts")
      .upsert({
        user_id: uid,
        access_token: access,
        refresh_token: refresh,
        token_type: "Bearer",
        scope: scopes,
        expires_at: expiresAt,
        connected_at: new Date(),
        spotify_user_id: spUser || null,
      }, { onConflict: "user_id" });

    if (upErr) {
      return NextResponse.json({ error: upErr.message, where: "spotify_accounts.upsert" }, { status: 400 });
    }

    // Mark profile as connected (RLS: own row)
    const { error: profErr } = await supa
      .from("profiles")
      .upsert({
        id: uid,
        spotify_connected: true,
        spotify_user_id: spUser || null,
        spotify_scopes: scopes,
        spotify_last_sync_at: null,
      }, { onConflict: "id" });

    if (profErr) {
      return NextResponse.json({ error: profErr.message, where: "profiles.upsert" }, { status: 400 });
    }

    // Clear temp cookies
    ["sp_access_token_tmp","sp_refresh_token_tmp","sp_expires_in_tmp","sp_scope_tmp","sp_user_tmp"]
      .forEach((n) => c.set(n, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0 }));

    return NextResponse.json({ ok: true, spotify_user_id: spUser || null, scopes });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

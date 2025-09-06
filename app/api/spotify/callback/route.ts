import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ENV } from "@/lib/env";

async function exchange(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: ENV.SPOTIFY_REDIRECT_URI,
  });
  const basic = Buffer.from(`${ENV.SPOTIFY_CLIENT_ID}:${ENV.SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number; scope: string }>;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const c = cookies();
  const expected = c.get("sp_state")?.value;
  c.delete("sp_state");

  if (!code || !state || !expected || state !== expected)
    return NextResponse.redirect(`${ENV.APP_BASE_URL}/profile?spotify=error`, 302);

  try {
    const tok = await exchange(code);
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    }).then((r) => r.json());

    const opts = { sameSite: "lax" as const, path: "/" };
    const r = NextResponse.redirect(`${ENV.APP_BASE_URL}/profile?spotify=connected`, 302);

    // raw tokens just for /my/attach (non-httpOnly so fetch will send them)
    r.cookies.set("sp_raw_access", tok.access_token, { ...opts, httpOnly: false, maxAge: tok.expires_in });
    r.cookies.set("sp_raw_refresh", tok.refresh_token || "", { ...opts, httpOnly: false, maxAge: 60 * 60 * 24 * 30 });

    // debug / status cookies
    r.cookies.set("sp_access_token_tmp", "true", { ...opts, httpOnly: true, maxAge: tok.expires_in });
    r.cookies.set("sp_refresh_token_tmp", "true", { ...opts, httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
    r.cookies.set("sp_scope_tmp", tok.scope || "", { ...opts, httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
    r.cookies.set("sp_expires_in_tmp", String(tok.expires_in || 3600), { ...opts, httpOnly: true, maxAge: 3600 });
    r.cookies.set("sp_user_tmp", me?.id || "", { ...opts, httpOnly: true, maxAge: 60 * 60 * 24 * 30 });

    return r;
  } catch {
    return NextResponse.redirect(`${ENV.APP_BASE_URL}/profile?spotify=error`, 302);
  }
}

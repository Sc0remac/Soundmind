import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  const base = process.env.APP_BASE_URL || "http://127.0.0.1:3000";
  const redirect = process.env.SPOTIFY_REDIRECT_URI || `${base}/api/spotify/callback`;
  if (!code) return NextResponse.redirect(`${base}/profile?spotify=error`);

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " + Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/profile?spotify=error`);
  }

  const t = await tokenRes.json(); // {access_token, refresh_token, scope, expires_in,...}
  let meId = "";
  try {
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${t.access_token}` },
    }).then(r => r.json());
    meId = me?.id || "";
  } catch {
    /* ignore – attach route can fetch it too */
  }

  const c = cookies();
  const maxAge = Math.max(60, Math.min(300, Number(t.expires_in || 300)));
  c.set("sp_access_token_tmp", t.access_token, { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  c.set("sp_refresh_token_tmp", t.refresh_token || "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  c.set("sp_expires_in_tmp", String(t.expires_in || 3600), { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  c.set("sp_scope_tmp", t.scope || "", { httpOnly: true, sameSite: "lax", path: "/", maxAge });
  c.set("sp_user_tmp", meId, { httpOnly: true, sameSite: "lax", path: "/", maxAge });

  return NextResponse.redirect(`${base}/profile?spotify=connected`);
}

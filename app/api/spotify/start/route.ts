import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const base = process.env.APP_BASE_URL || new URL(req.url).origin;
  const redirect = process.env.SPOTIFY_REDIRECT_URI || `${base}/api/spotify/callback`;
  const scope = ["user-read-recently-played", "user-top-read"].join(" ");

  const u = new URL("https://accounts.spotify.com/authorize");
  u.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID!);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("scope", scope);
  u.searchParams.set("state", Math.random().toString(36).slice(2));
  u.searchParams.set("show_dialog", "true"); // force the page to appear

  return NextResponse.redirect(u);
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ENV } from "@/lib/env";

const SCOPE = ["user-read-recently-played", "user-top-read"].join(" ");

function randomState(len = 16) {
  const cs = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += cs[Math.floor(Math.random() * cs.length)];
  return s;
}

export async function GET() {
  const state = randomState();
  cookies().set("sp_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", ENV.SPOTIFY_CLIENT_ID);
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("redirect_uri", ENV.SPOTIFY_REDIRECT_URI);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");

  return NextResponse.redirect(url, 302);
}

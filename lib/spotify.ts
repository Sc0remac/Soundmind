// /lib/spotify.ts
import { supabaseService } from "./supabaseAdmin";

const SPOTIFY_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT = process.env.SPOTIFY_REDIRECT_URI!;

export function authUrl(state: string) {
  const scopes = [
    "user-read-recently-played",
    "user-top-read",
  ].join(" ");
  const u = new URL("https://accounts.spotify.com/authorize");
  u.searchParams.set("client_id", SPOTIFY_ID);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("redirect_uri", SPOTIFY_REDIRECT);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("state", state);
  return u.toString();
}

export async function exchangeCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: SPOTIFY_REDIRECT,
    client_id: SPOTIFY_ID,
    client_secret: SPOTIFY_SECRET,
  });
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token-exchange ${r.status}`);
  return r.json() as Promise<{
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: "Bearer";
    expires_in: number;
  }>;
}

export async function refreshToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: SPOTIFY_ID,
    client_secret: SPOTIFY_SECRET,
  });
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error(`token-refresh ${r.status}`);
  return r.json() as Promise<{
    access_token: string;
    scope: string;
    token_type: "Bearer";
    expires_in: number;
    refresh_token?: string;
  }>;
}

export async function fetchSpotifyMe(access_token: string) {
  const r = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!r.ok) throw new Error(`me ${r.status}`);
  return r.json();
}

export async function getAccountForUser(user_id: string) {
  const admin = supabaseService();
  const { data, error } = await admin
    .from("spotify_accounts")
    .select("*")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function upsertAccount(user_id: string, fields: Record<string, any>) {
  const admin = supabaseService();
  const { error } = await admin.from("spotify_accounts").upsert({ user_id, ...fields });
  if (error) throw error;
}

export async function fetchRecentlyPlayed(access_token: string, afterMs?: number) {
  const url = new URL("https://api.spotify.com/v1/me/player/recently-played");
  url.searchParams.set("limit", "50");
  if (afterMs) url.searchParams.set("after", String(afterMs));
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!r.ok) throw new Error(`recently-played ${r.status}`);
  return r.json() as Promise<{ items: any[] }>;
}

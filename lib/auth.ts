// lib/auth.ts
import { createClient } from "@supabase/supabase-js";

export function getBearerFromRequest(req: Request): string | null {
  // 1) Standard Authorization header
  const a = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = a.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1];

  // 2) Fallback: look for Supabase auth cookie in the Cookie header
  // Cookie name shape: sb-<project-ref>-auth-token
  const cookieHeader = req.headers.get("cookie") || req.headers.get("Cookie") || "";
  if (cookieHeader) {
    try {
      const parts = cookieHeader.split(/;\s*/);
      const authCookie = parts.find((p) => /sb-.*-auth-token=/.test(p));
      if (authCookie) {
        const raw = decodeURIComponent(authCookie.split("=").slice(1).join("="));
        // Cookie value is a JSON string: { access_token, refresh_token, ... }
        const parsed = JSON.parse(raw);
        if (parsed?.access_token && typeof parsed.access_token === "string") return parsed.access_token;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase URL/Anon key missing in env.");
  return { url, key };
}

/** RLS-aware Supabase client using the user's JWT from the request */
export function supabaseFromRequest(req: Request) {
  const { url, key } = getEnv();
  const jwt = getBearerFromRequest(req);
  const supa = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: jwt ? { Authorization: `Bearer ${jwt}` } : {} },
  });
  return { supa, jwt };
}

export async function requireUserFromRequest(req: Request) {
  const { supa } = supabaseFromRequest(req);
  const { data, error } = await supa.auth.getUser();
  if (error || !data?.user) throw new Error(error?.message || "Unauthorized");
  return data.user;
}

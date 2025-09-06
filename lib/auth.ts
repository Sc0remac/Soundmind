// lib/auth.ts
import { createClient } from "@supabase/supabase-js";

export function getBearerFromRequest(req: Request): string | null {
  const a = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = a.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
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

import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

const admin = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function requireUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return { ok: false as const, status: 401, error: "Missing bearer token" };
  }
  const token = m[1];
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false as const, status: 401, error: "Invalid token" };
  }
  return { ok: true as const, user: data.user };
}

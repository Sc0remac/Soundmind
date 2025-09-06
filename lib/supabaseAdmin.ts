import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
}

export const supabaseAdmin = createClient(url, serviceKey || "MISSING_SERVICE_ROLE_KEY", {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Convenience flag we can return in API JSON
export const usingServiceRole = !!serviceKey && serviceKey.length > 40;

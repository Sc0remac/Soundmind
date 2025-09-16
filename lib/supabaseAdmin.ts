// lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Expose whether the service role key is configured so API routes can bail early
export const usingServiceRole = !!(url && serviceKey);

// Lazily create a Supabase client that uses the service role key.  This should
// only be used in server-side code as it has full access to the database.
export function supabaseService() {
  if (!usingServiceRole) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Convenience singleton for callers that just need a client instance.
export const supabaseAdmin: SupabaseClient = usingServiceRole
  ? supabaseService()
  : (null as unknown as SupabaseClient);

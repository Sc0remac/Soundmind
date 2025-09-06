import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

export const supabaseServer = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

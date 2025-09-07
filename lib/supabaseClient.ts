import { createClient } from '@supabase/supabase-js';

// Browser client: only initialize if env vars are present. During build or tests
// where env may be missing, this will be `null` to avoid throw.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as any);

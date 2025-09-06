import { createClient } from '@supabase/supabase-js';

// Create a browser client. This can be used in client components.
// The environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// must be defined in your `.env.local` file. They are safe to expose because
// Supabase uses row-level security to restrict access by user.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a server-side client. This uses the service role key which should never
// be exposed to the browser. It is only used in server actions or API routes.
export function getServiceSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(supabaseUrl, serviceRoleKey);
}
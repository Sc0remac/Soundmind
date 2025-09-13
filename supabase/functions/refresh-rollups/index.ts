import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async () => {
  const admin = createClient(URL, SRV, { auth: { persistSession: false, autoRefreshToken: false } });
  const t0 = Date.now();
  try {
    await (admin as any).rpc("refresh_insights_materialized");
  } catch {}
  try {
    await (admin as any).rpc("refresh_music_rollups");
  } catch {}
  const ms = Date.now() - t0;
  return new Response(JSON.stringify({ ok: true, ms }), { headers: { "Content-Type": "application/json" } });
});

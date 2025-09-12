// lib/env.ts
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

type Req = (typeof required)[number];

function fail(msg: string): never {
  // Fail during boot with a helpful message
  throw new Error(`[env] ${msg}`);
}

const values = Object.fromEntries(
  required.map((k) => [k, process.env[k] ?? ''])
) as Record<Req, string>;

const missing = Object.entries(values).filter(([, v]) => !v);
if (missing.length) {
  fail(`Missing env vars: ${missing.map(([k]) => k).join(', ')}`);
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: values.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  // DO NOT import this into client files
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? undefined,
} as const;

// lib/supabaseServer.ts
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from './env';

export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookieList) => {
          // Required for SSR auth cookie updates
          cookieList.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      headers: {
        'x-forwarded-for': headers().get('x-forwarded-for') ?? '',
      },
    }
  );
}

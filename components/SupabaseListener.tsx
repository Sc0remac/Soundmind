'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SupabaseListener() {
  const router = useRouter();

  useEffect(() => {
    // ensure cookies are written once we have a session, then refresh RSC
    supabase.auth.getSession().finally(() => router.refresh());

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}

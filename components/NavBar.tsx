"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const [user, setUser] = useState<null | { id: string; email?: string }>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const initials = (user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <nav className="border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between py-3 px-4">
        <Link href="/" className="font-semibold">
          Soundmind
        </Link>

        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/log-workout" className="hover:underline">
                Log Workout
              </Link>
              <Link href="/log-mood" className="hover:underline">
                Log Mood
              </Link>
              <Link href="/music" className="hover:underline">
                Music
              </Link>
              <Link href="/timeline" className="hover:underline">
                Timeline
              </Link>
              <Link href="/insights" className="hover:underline">
                Insights
              </Link>

              <div className="relative group">
                <button className="flex h-8 w-8 items-center justify-center rounded-full border bg-white hover:bg-gray-50">
                  <span className="text-xs font-semibold">{initials}</span>
                </button>
                <div className="absolute right-0 z-50 mt-2 hidden w-40 rounded-lg border bg-white py-2 shadow-lg group-hover:block">
                  <Link href="/profile" className="block px-3 py-2 text-sm hover:bg-gray-50">
                    View Profile
                  </Link>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link href="/signup" className="hover:underline">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

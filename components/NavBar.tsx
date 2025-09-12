"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
  const [user, setUser] = useState<null | { id: string }>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="mb-6 flex items-center justify-between">
      <Link href="/" className="group inline-flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-card" />
        <span className="text-lg font-semibold tracking-tight transition-colors group-hover:text-indigo-300">
          Soundmind
        </span>
      </Link>

      <nav className="flex items-center gap-2 text-sm">
        {user ? (
          <>
            <Link href="/workout/new" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Log workout
            </Link>
            <Link href="/mood/new" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Log mood
            </Link>
            <Link href="/music" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Music
            </Link>
            <Link href="/timeline" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Timeline
            </Link>
            <Link href="/insights" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Insights
            </Link>
            <div className="relative group">
              <button className="rounded-xl px-3 py-2 hover:bg-white/5">Profile</button>
              <div className="absolute right-0 z-10 mt-2 hidden w-40 rounded-xl border bg-white py-2 text-gray-900 group-hover:block">
                <Link
                  href="/profile"
                  className="block px-3 py-2 text-sm hover:bg-gray-100"
                >
                  View Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                >
                  Log out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Log in
            </Link>
            <Link href="/signup" className="rounded-xl px-3 py-2 hover:bg-white/5">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}


"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NavBar() {
<<<<<<< ours
  const [user, setUser] = useState<null | { id: string }>(null);
=======
  const [user, setUser] = useState<null | { id: string; email?: string }>(null);
>>>>>>> theirs

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
<<<<<<< ours
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
=======
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
>>>>>>> theirs
  );
}


"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    window.addEventListener("mousedown", listener);
    return () => window.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

export default function NavBar() {
  const [user, setUser] = useState<null | { id: string; email?: string }>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useOnClickOutside(menuRef, () => setOpen(false));

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      const u = data.user ?? null;
      setUser(u);
      if (u) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name, is_admin")
          .eq("id", u.id)
          .maybeSingle();
        setIsAdmin(!!prof?.is_admin);
      } else {
        setIsAdmin(false);
      }
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => {
      const u = s?.user ?? null;
      setUser(u);
      if (u) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data }: { data: any }) => setIsAdmin(!!data?.is_admin));
      } else setIsAdmin(false);
    });
    return () => sub.subscription?.unsubscribe?.();
  }, []);

  const initials = (user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <nav className="border-b bg-white/70 backdrop-blur">
      <div className="container flex items-center justify-between py-3">
        <Link href="/" className="font-semibold">Soundmind</Link>

        <div className="flex items-center gap-4">
          <Link href="/log-workout">Log Workout</Link>
          <Link href="/mood/new">Log Mood</Link>
          <Link href="/timeline">Timeline</Link>
          <Link href="/insights">Insights</Link>
          <Link href="/music">Music</Link>
          <Link href="/manage/splits">Splits</Link>
          <Link href="/manage/exercises">Exercises</Link>

          <div className="relative" ref={menuRef}>
            <button
              className="w-8 h-8 rounded-full border flex items-center justify-center bg-white hover:bg-gray-50"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label="Profile menu"
            >
              <span className="text-xs font-semibold">{initials}</span>
            </button>

            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg border bg-white shadow-lg overflow-hidden z-50"
              >
                {user ? (
                  <>
                    <Link href="/profile" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                      Profile
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                        Admin
                      </Link>
                    )}
                    <button
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => {
                        setOpen(false);
                        supabase.auth.signOut();
                      }}
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                      Log in
                    </Link>
                    <Link href="/signup" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setOpen(false)}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

"use client";

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

export default function HeaderNav() {
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
          .select("is_admin")
          .eq("id", u.id)
          .maybeSingle();
        setIsAdmin(!!prof?.is_admin);
      } else {
        setIsAdmin(false);
      }
    }
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user ?? null;
      setUser(u);
      if (u) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", u.id)
          .maybeSingle()
          .then(({ data }) => setIsAdmin(!!data?.is_admin));
      } else setIsAdmin(false);
    });
    return () => sub.subscription?.unsubscribe?.();
  }, []);

  if (!user) {
    return (
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/signup" className="rounded-xl px-3 py-2 hover:bg-white/5">
          Sign up
        </Link>
        <Link href="/login" className="rounded-xl px-3 py-2 hover:bg-white/5">
          Log in
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link href="/workout/new" className="rounded-xl px-3 py-2 hover:bg-white/5">
        Log workout
      </Link>
      <Link href="/mood/new" className="rounded-xl px-3 py-2 hover:bg-white/5">
        Log mood
      </Link>
      <Link href="/timeline" className="rounded-xl px-3 py-2 hover:bg-white/5">
        Timeline
      </Link>
      <Link href="/music" className="rounded-xl px-3 py-2 hover:bg-white/5">
        Music
      </Link>
      <Link href="/insights" className="rounded-xl px-3 py-2 hover:bg-white/5">
        Insights
      </Link>
      <div className="relative" ref={menuRef}>
        <button
          className="rounded-xl px-3 py-2 hover:bg-white/5"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Profile menu"
        >
          Profile
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-48 rounded-lg border border-white/10 bg-slate-800 shadow-lg overflow-hidden z-50"
          >
            <Link
              href="/profile"
              className="block px-3 py-2 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/settings"
              className="block px-3 py-2 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              Settings
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="block px-3 py-2 hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            )}
            <button
              className="w-full text-left px-3 py-2 hover:bg-white/5"
              onClick={() => {
                setOpen(false);
                supabase.auth.signOut();
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}


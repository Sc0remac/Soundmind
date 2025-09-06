"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        if (mounted) setOk(false);
        return;
      }
      const res = await fetch("/api/admin/verify", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (mounted) setOk(res.ok);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (ok === null) return <p className="text-sm text-gray-600">Checking admin…</p>;
  if (!ok) return <p className="text-sm text-red-600">403 — Admins only.</p>;
  return <>{children}</>;
}

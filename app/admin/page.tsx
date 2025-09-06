"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Metrics = {
  totals: { users: number; workouts: number; moods: number };
  last7d: { workouts: number; moods: number };
};

export default function AdminHome() {
  const [m, setM] = useState<Metrics | null>(null);

  useEffect(() => {
    (async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setM(await res.json());
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Overview</h2>
      {!m ? (
        <p className="text-sm text-gray-600">Loading metrics…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border p-4">
            <div className="text-gray-500 text-sm">Users</div>
            <div className="text-2xl font-semibold">{m.totals.users}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-gray-500 text-sm">Workouts</div>
            <div className="text-2xl font-semibold">{m.totals.workouts}</div>
            <div className="text-xs text-gray-500 mt-1">Last 7d: {m.last7d.workouts}</div>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-gray-500 text-sm">Moods</div>
            <div className="text-2xl font-semibold">{m.totals.moods}</div>
            <div className="text-xs text-gray-500 mt-1">Last 7d: {m.last7d.moods}</div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Note: Admin APIs return **aggregated** metrics only. Journals, raw moods, and user-owned data remain private under RLS.
      </p>
    </div>
  );
}

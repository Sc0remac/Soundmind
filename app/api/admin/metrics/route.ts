import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });

  // Totals (aggregated; no sensitive fields returned)
  const [{ count: users }, { count: workouts }, { count: moods }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("workouts").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("moods").select("*", { count: "exact", head: true }),
  ]);

  // 7-day new counts
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  const [w7, m7] = await Promise.all([
    supabaseAdmin.from("workouts").select("created_at").gte("created_at", sinceISO),
    supabaseAdmin.from("moods").select("created_at").gte("created_at", sinceISO),
  ]);

  return NextResponse.json({
    totals: { users: users ?? 0, workouts: workouts ?? 0, moods: moods ?? 0 },
    last7d: { workouts: w7.data?.length ?? 0, moods: m7.data?.length ?? 0 },
  });
}

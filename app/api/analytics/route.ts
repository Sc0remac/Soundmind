// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/app/api/insights/_common";

export async function POST(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);
    const body = await req.json().catch(() => ({}));
    const event = String(body?.event || "").trim();
    const payload = body?.payload ?? {};
    if (!event) return NextResponse.json({ ok: false, error: "missing event" }, { status: 400 });

    // Best-effort insert; if table doesn't exist, swallow error
    try {
      await client.from("analytics_events").insert({ user_id: userId, event, payload });
    } catch {
      // ignore missing table
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string } | undefined;
    const status = (err && err.status) || 500;
    return NextResponse.json({ ok: false, error: (err && err.message) || String(e) }, { status });
  }
}

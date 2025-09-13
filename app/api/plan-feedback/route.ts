// app/api/plan-feedback/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/app/api/insights/_common";

export async function POST(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);
    const body = await req.json();
    const plan_id = String(body?.plan_id || "").trim();
    const verdict = String(body?.verdict || "").trim(); // "keep" | "not_for_me"
    const reason = body?.reason != null ? String(body.reason) : null;
    if (!plan_id) return NextResponse.json({ error: "missing plan_id" }, { status: 400 });
    if (!verdict || (verdict !== "keep" && verdict !== "not_for_me")) return NextResponse.json({ error: "invalid verdict" }, { status: 400 });
    if (verdict === "not_for_me" && !reason) return NextResponse.json({ error: "reason required" }, { status: 400 });

    try {
      await client.from("user_feedback").insert({ user_id: userId, plan_id, verdict, reason });
    } catch (e) {
      // ignore if table missing; still return ok so UX proceeds
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e?.status || 500;
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status });
  }
}


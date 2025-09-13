// app/api/preferences/route.ts
import { NextResponse } from "next/server";
import { getUserAndClient } from "@/app/api/insights/_common";

export async function GET(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);
    const { data } = await client.from("user_preferences").select("prefs").eq("user_id", userId).maybeSingle();
    return NextResponse.json({ prefs: data?.prefs ?? {} });
  } catch (e: any) {
    return NextResponse.json({ prefs: {} });
  }
}

export async function POST(req: Request) {
  try {
    const { client, userId } = await getUserAndClient(req);
    const body = await req.json().catch(() => ({}));
    const prefs = body?.prefs || {};
    await client.from("user_preferences").upsert({ user_id: userId, prefs, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}


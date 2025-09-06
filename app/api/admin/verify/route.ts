import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const v = await requireAdminFromRequest(req);
  if (!v.ok) return NextResponse.json({ error: v.message }, { status: v.status });
  return NextResponse.json({ ok: true });
}

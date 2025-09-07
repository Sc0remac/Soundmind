// /app/api/spotify/my/reset-cursor/route.ts
import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth";
import { upsertAccount } from "@/lib/spotify";

export async function POST(req: Request) {
  const user = await requireUserFromRequest(req);
  await upsertAccount(user.id, { cursor_after_ms: null });
  return NextResponse.json({ ok: true });
}

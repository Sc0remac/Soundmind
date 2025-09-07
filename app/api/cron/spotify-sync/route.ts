import { NextResponse } from "next/server";

// Placeholder cron endpoint; implementation pending
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}

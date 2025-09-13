// app/api/spotify/my/sync/route.ts
// Moved heavy logic to Supabase Edge Function `spotify-sync-user`.
// This route now proxies to the Edge Function with the caller's JWT.
import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { jwt } = supabaseFromRequest(req);
    if (!jwt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "1";
    const fn = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/spotify-sync-user${full ? "?full=1" : ""}`;
    const r = await fetch(fn, { method: "POST", headers: { Authorization: `Bearer ${jwt}` } });
    const text = await r.text();
    return new NextResponse(text, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") || "application/json" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

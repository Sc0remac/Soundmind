// app/api/enrich/isrc/route.ts
// Proxies to Supabase Edge Function `enrich-spotify-isrc`.
import { NextResponse } from "next/server";
import { supabaseFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { jwt } = supabaseFromRequest(req);
    if (!jwt) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const fn = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-spotify-isrc`;
    const r = await fetch(fn, { method: "POST", headers: { Authorization: `Bearer ${jwt}` } });
    const txt = await r.text();
    return new NextResponse(txt, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") || "application/json" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

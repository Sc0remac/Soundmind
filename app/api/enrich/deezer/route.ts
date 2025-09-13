// app/api/enrich/deezer/route.ts
// Proxies to Supabase Edge Function `enrich-deezer-features`.
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const fn = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enrich-deezer-features`;
    const r = await fetch(fn, { method: "POST" });
    const txt = await r.text();
    return new NextResponse(txt, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") || "application/json" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

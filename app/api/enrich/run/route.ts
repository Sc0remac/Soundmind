// app/api/enrich/run/route.ts
import { NextResponse } from "next/server";

/**
 * Orchestrates metadata enrichment by calling internal routes:
 *  - /api/enrich/isrc   (needs Authorization header -> pass-through)
 *  - /api/enrich/deezer
 *  - /api/enrich/lastfm
 */
export async function POST(req: Request) {
  const origin = new URL(req.url).origin;
  const authHeader = req.headers.get("authorization") || "";

  async function call(path: string, withAuth = false) {
    const r = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: withAuth && authHeader ? { Authorization: authHeader } : undefined,
      cache: "no-store",
    });
    const status = r.status;
    let json: any = null;
    try {
      json = await r.json();
    } catch {
      json = { text: await r.text() };
    }
    return { status, json };
  }

  const [isrc, deezer, lastfm] = await Promise.all([
    call("/api/enrich/isrc", true),   // needs bearer
    call("/api/enrich/deezer"),       // no bearer needed
    call("/api/enrich/lastfm"),       // no bearer needed
  ]);

  return NextResponse.json({ ok: true, isrc, deezer, lastfm });
}

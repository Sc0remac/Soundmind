/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/enrich/run/route.ts
import { NextResponse } from "next/server";

/**
 * Orchestrates metadata enrichment by calling internal routes:
 *  - /api/enrich/isrc   (needs Authorization header -> pass-through)
 *  - /api/enrich/deezer
 *  - /api/enrich/lastfm
 */
export async function POST(req: Request) {
  // `localhost` may resolve to an IPv6 address which our dev server doesn't
  // listen on (it binds to 127.0.0.1).  When that happens, internal fetch
  // calls below fail with `ECONNREFUSED ::1:3000`.  Force the hostname to an
  // IPv4 loopback address to ensure the requests reach the running server.
  const url = new URL(req.url);
  const host = url.host.replace("localhost", "127.0.0.1");
  const origin = `${url.protocol}//${host}`;

  const authHeader = req.headers.get("authorization") || "";

  async function call(path: string, withAuth = false) {
    const r = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: withAuth && authHeader ? { Authorization: authHeader } : undefined,
      cache: "no-store",
    });
    const status = r.status;
    const text = await r.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { text };
    }
    return { status, json };
  }

  const [isrc, deezer, lastfm, reccobeats] = await Promise.all([
    call("/api/enrich/isrc", true),   // needs bearer
    call("/api/enrich/deezer"),       // no bearer needed
    call("/api/enrich/lastfm"),       // no bearer needed
    call("/api/enrich/reccobeats"),   // no bearer needed
  ]);

  return NextResponse.json({ ok: true, isrc, deezer, lastfm, reccobeats });
}

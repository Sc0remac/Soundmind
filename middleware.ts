import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Dev only: normalize host so OAuth cookies stay on a single origin.
 * We EXCLUDE /_next and common static assets to avoid interfering with HMR.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  if (process.env.NODE_ENV !== "production") {
    // Only rewrite page/data routes; leave assets alone.
    const path = url.pathname;

    const isAsset =
      path.startsWith("/_next") ||
      path.startsWith("/favicon.ico") ||
      path.startsWith("/robots.txt") ||
      path.startsWith("/sitemap.xml") ||
      path.startsWith("/static/") ||
      /\.(?:css|js|map|png|jpg|jpeg|gif|svg|webp|ico|txt|mp4|woff2?)$/i.test(path);

    if (!isAsset && url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return NextResponse.redirect(url, 307);
    }
  }

  return NextResponse.next();
}

// Match everything except Next internals/static (we also check inside the fn)
export const config = {
  matcher: [
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|static/).*)",
  ],
};

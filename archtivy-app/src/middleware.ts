import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isMaintenanceMode, MAINTENANCE_RETRY_AFTER_SECONDS } from "@/lib/maintenance";

const clerk = clerkMiddleware();

/** Paths that must remain reachable during maintenance. */
function isMaintenancePassthrough(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/og" || pathname.startsWith("/og/")) return true;
  if (pathname === "/logo" || pathname.startsWith("/logo/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  return false;
}

/**
 * Maintenance response: 503 Service Unavailable.
 *
 * Never redirect to "/" here. A 307 to the homepage tells Google that every URL
 * on the site is a duplicate of the homepage and de-indexes the whole site; a 503
 * with Retry-After tells it to hold the index and come back later.
 */
function maintenanceResponse(): NextResponse {
  return new NextResponse(
    "Archtivy is temporarily unavailable for maintenance. Please check back soon.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(MAINTENANCE_RETRY_AFTER_SECONDS),
        "X-Robots-Tag": "noindex",
        "Cache-Control": "no-store",
      },
    }
  );
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isMaintenanceMode() && !isMaintenancePassthrough(req.nextUrl.pathname)) {
    return maintenanceResponse();
  }

  return clerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|otf)$).*)",
  ],
};

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isMaintenanceMode, MAINTENANCE_RETRY_AFTER_SECONDS } from "@/lib/maintenance";
import {
  isComingSoonMode,
  isComingSoonBypass,
  COMING_SOON_PATH,
} from "@/lib/comingSoon";

/**
 * Clerk middleware, with the pre-launch gate running inside the handler.
 *
 * The gate must live here rather than before clerkMiddleware because deciding
 * whether a visitor is signed in requires Clerk's `auth()`, which only exists
 * inside this callback.
 *
 * Order matters: the mode and bypass checks run BEFORE `await auth()`, so
 * bypassed paths (webhooks, /api/revalidate, /og) skip the session lookup
 * entirely, and the gate costs nothing at all while COMING_SOON_MODE is off.
 *
 * Returning undefined hands control back to Clerk, which is what lets it
 * complete its own session handshake normally.
 *
 * REWRITE, not a direct response: the gate renders live platform totals, which
 * need the Supabase service client and unstable_cache — both Node-only, and
 * this runs on the edge. Rewriting to /coming-soon lets that Route Handler
 * render it. The visitor's URL is preserved and the handler's 503 passes
 * through, neither of which a redirect would do.
 */
const clerk = clerkMiddleware(async (auth, req) => {
  if (!isComingSoonMode()) return;
  if (isComingSoonBypass(req.nextUrl.pathname)) return;

  const { userId } = await auth();
  if (userId) return;

  return NextResponse.rewrite(new URL(COMING_SOON_PATH, req.url));
});

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

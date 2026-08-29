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

/**
 * /explore/projects → /projects, 308, with the query translated.
 *
 * ── WHY IT LIVES HERE AND NOT IN THE PAGE ───────────────────────────────────
 * A page-level `permanentRedirect` was tried first and did not fire: the route
 * is an optional catch-all with no dynamic data of its own, so Next evaluated
 * it once at build time against an empty searchParams and served that single
 * prerendered result for every query string. `force-dynamic` did not change
 * it. Middleware runs before routing, sees the real URL every time, and is the
 * canonical place for a route-level redirect anyway.
 *
 * ── WHY REDIRECT AT ALL ─────────────────────────────────────────────────────
 * There were three project result surfaces — /projects, the
 * /projects/{taxonomy} archive, and the Explore results UI — all drawing the
 * same listings differently, and every project search in the app submitted to
 * /explore/projects?q=. Searching from the new directory landed you in the old
 * one. /projects is now the single canonical project discovery route.
 *
 * 308 rather than 302: this route's own metadata ALREADY declared
 * /projects/{slug_path} as its canonical URL, so it was self-identifying as
 * duplicate content before today, and it has been removed from sitemap.ts in
 * the same change. A permanent redirect passes the link equity of indexed and
 * external /explore/projects URLs to the page that now serves them, instead of
 * stranding them on a duplicate.
 *
 * ── NO FILTER IS SILENTLY DROPPED ───────────────────────────────────────────
 * Explore and the directory grew separate parameter vocabularies. Names that
 * mean the same thing pass straight through; `year` becomes the directory's
 * min and max of the same value; explore's `newest` becomes `recent`. Its
 * `year_desc` and `area_desc` have no directory equivalent and are dropped
 * from `sort` rather than mapped onto an order that would sort differently
 * while claiming to be the same. Everything else is carried across untouched,
 * so the URL still records what the visitor asked for.
 */
const EXPLORE_SORT_TO_DIRECTORY: Record<string, string> = { newest: "recent" };

/**
 * /explore/products → /products, on the same terms as the projects redirect
 * above.
 *
 * ── VOCABULARY COMPARED BEFORE REDIRECTING ──────────────────────────────────
 * Explore and the products directory name most things identically, so most
 * params pass straight through: `q`, `category`, `materials`, `color`,
 * `brands`, `sustainability`. Two need translating — explore's single `year`
 * has no directory equivalent at all on the product side (there is no year
 * filter in the product facets), and `sort: newest` becomes `recent`.
 *
 * `year`, `year_min`, `year_max`, `designers`, `taxonomy_materials`,
 * `material_type`, `area_bucket`, `product_stage` and `collaboration` have no
 * product-directory filter behind them. They are carried across UNTOUCHED
 * rather than deleted, so the URL still records what the visitor asked for and
 * nothing is silently discarded; they simply do not narrow the results yet.
 */
function productDiscoveryRedirect(req: NextRequest): NextResponse | undefined {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname !== "/explore/products" && !pathname.startsWith("/explore/products/")) {
    return undefined;
  }

  const slugPath = pathname.slice("/explore/products".length).replace(/^\/+|\/+$/g, "");
  const out = new URLSearchParams();

  const handled = new Set(["sort", "page", "category"]);
  for (const [k, v] of searchParams.entries()) {
    if (handled.has(k)) continue;
    if (v.trim()) out.set(k, v.trim());
  }

  // A slug segment scopes the path, so a `category` param beside it would be a
  // second, conflicting scope.
  const category = searchParams.get("category")?.trim();
  if (category && !slugPath) out.set("category", category);

  const sort = searchParams.get("sort")?.trim();
  if (sort && EXPLORE_SORT_TO_DIRECTORY[sort]) {
    out.set("sort", EXPLORE_SORT_TO_DIRECTORY[sort]);
  }

  const url = req.nextUrl.clone();
  url.pathname = slugPath ? `/products/${slugPath}` : "/products";
  url.search = out.toString() ? `?${out.toString()}` : "";
  return NextResponse.redirect(url, 308);
}

function projectDiscoveryRedirect(req: NextRequest): NextResponse | undefined {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname !== "/explore/projects" && !pathname.startsWith("/explore/projects/")) {
    return undefined;
  }

  const slugPath = pathname.slice("/explore/projects".length).replace(/^\/+|\/+$/g, "");
  const out = new URLSearchParams();

  // A slug segment scopes the path itself, so a `category` param alongside it
  // would be a second, conflicting scope.
  const handled = new Set(["year", "sort", "page", "category"]);
  for (const [k, v] of searchParams.entries()) {
    if (handled.has(k)) continue;
    if (v.trim()) out.set(k, v.trim());
  }

  const category = searchParams.get("category")?.trim();
  if (category && !slugPath) out.set("category", category);

  const year = searchParams.get("year")?.trim();
  if (year && !out.has("year_min")) {
    out.set("year_min", year);
    out.set("year_max", year);
  }

  const sort = searchParams.get("sort")?.trim();
  if (sort && EXPLORE_SORT_TO_DIRECTORY[sort]) {
    out.set("sort", EXPLORE_SORT_TO_DIRECTORY[sort]);
  }

  const url = req.nextUrl.clone();
  url.pathname = slugPath ? `/projects/${slugPath}` : "/projects";
  url.search = out.toString() ? `?${out.toString()}` : "";
  return NextResponse.redirect(url, 308);
}

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

  // Before Clerk: this is a pure URL rewrite with no session dependency, and
  // running it first means the redirect costs no auth lookup.
  const unified = projectDiscoveryRedirect(req) ?? productDiscoveryRedirect(req);
  if (unified) return unified;

  return clerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf|otf)$).*)",
  ],
};

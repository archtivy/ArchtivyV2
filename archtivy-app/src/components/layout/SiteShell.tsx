"use client";

import { usePathname } from "next/navigation";
import { ExploreToolHeader } from "@/components/explore/ExploreToolHeader";

/**
 * What wraps a route, for the two cases a page cannot decide for itself.
 *
 * ── WHAT THIS USED TO BE ────────────────────────────────────────────────────
 * A seven-branch router that chose between TopNav + PageContainer, TopNav +
 * full-width, TopNav + a cream <main> for static pages, the explore tool
 * header, and "bare" for the growing list of routes that had moved to HomeNav.
 * Every new page meant picking a branch, and picking wrong was invisible:
 * HomeNav is `fixed top-0 z-50` and opaque, so a page that drew its own header
 * inside the TopNav shell covered the shell's header exactly. That is how
 * /me/dashboard, /me/listings, /me/profile, /me/files, /me/listings/[id]/edit
 * and /status each shipped with two headers.
 *
 * ── WHAT IT IS NOW ──────────────────────────────────────────────────────────
 * Pages own their chrome. SitePage draws HomeNav and the column; a page that
 * wants a header renders SitePage, and the default here is to wrap nothing at
 * all. Two exceptions remain, both because the chrome is genuinely not the
 * page's to draw:
 *
 *   auth / onboarding / admin — fullscreen surfaces with their own navigation,
 *     or none at all.
 *   /explore — the fullscreen map tool. Its header is tool chrome (view
 *     switcher, filters) rather than site chrome, and it has to sit inside a
 *     flex column that owns the viewport height, which a page-level component
 *     cannot do from inside.
 *
 * Nothing else routes through here. A new page renders SitePage and appears
 * correctly without touching this file — which is the whole point.
 */

// Fullscreen surfaces: Clerk's own screens, the onboarding flow, and admin,
// which has its own layout and sidebar.
const BARE_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/complete-profile", "/admin"];

// The fullscreen map tool. Exact match: /explore/projects and /explore/products
// are ordinary pages that render SitePage.
const TOOL_PATHS = ["/explore"];

function hasPrefix(pathname: string | null, prefixes: string[]): boolean {
  if (!pathname) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (hasPrefix(pathname, BARE_PREFIXES)) {
    return (
      <div className="min-h-screen w-full" style={{ minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  if (pathname && TOOL_PATHS.includes(pathname)) {
    return (
      <div className="flex h-screen flex-col">
        <ExploreToolHeader />
        <main className="relative min-h-0 flex-1">{children}</main>
      </div>
    );
  }

  return <>{children}</>;
}

"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Footer } from "@/components/layout/Footer";
import { ExploreToolHeader } from "@/components/explore/ExploreToolHeader";

// Routes that should render "shellless" (no public TopNav/Footer/PageContainer).
// Admin has its own layout + navigation, so treat it like auth/onboarding here.
const AUTH_PATH_PREFIXES = ["/sign-in", "/sign-up", "/onboarding", "/complete-profile", "/admin"];

// Routes that show a minimal tool header (no main site nav).
const TOOL_PATHS = ["/explore"];

/**
 * Routes on the editorial cream palette that render their own HomeNav and
 * HomeFooter instead of the global TopNav/Footer. Keep in sync with
 * FOOTERLESS_ROUTES in ConditionalFooter, or a page gets two footers.
 */
const EDITORIAL_ROUTES = new Set([
  "/",
  "/projects",
  "/products",
  "/designers",
  "/brands",
  "/magazine",
  "/inspiration",
  // The publish wizard renders its own HomeNav on the cream palette. Left on
  // the legacy zinc TopNav it read as a blue admin form bolted onto an
  // editorial product — the exact mismatch the brief was written against.
  "/add/project",
  "/add/product",
]);

// Routes that show TopNav but skip PageContainer (full-width content).
const FULL_WIDTH_PATHS: string[] = [];

/**
 * Corporate / static pages, restyled onto the editorial tokens.
 *
 * These were built on the legacy zinc palette while the rest of the platform
 * moved to cream/ink/hairline, so they read as a different product. The ground
 * is set here rather than inside each page because a page rendered inside
 * PageContainer cannot paint full-bleed behind the container it sits in.
 */
const STATIC_PAGE_ROUTES = new Set([
  "/about",
  "/vision",
  "/how-it-works",
  "/partners",
  "/careers",
  "/press",
  "/press-kit",
  "/contact",
  "/faq",
  "/guidelines",
  "/privacy",
  "/terms",
  "/cookies",
  "/data-processing",
  "/api-docs",
  "/data-intelligence",
  "/brand-intelligence",
]);

function isStaticPageRoute(pathname: string | null): boolean {
  return !!pathname && STATIC_PAGE_ROUTES.has(pathname);
}

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isToolRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return TOOL_PATHS.some((p) => pathname === p);
}

function isFullWidthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return FULL_WIDTH_PATHS.some((p) => pathname === p);
}

interface SiteShellProps {
  children: React.ReactNode;
}

/**
 * For auth/onboarding routes: render children only in a fullscreen wrapper (no Header, no Footer, no PageContainer).
 * For tool routes (/explore): render minimal ExploreToolHeader + children (no footer).
 * For all other routes: render TopNav + main + PageContainer + children + Footer.
 */
export function SiteShell({ children }: SiteShellProps) {
  const pathname = usePathname();
  const auth = isAuthRoute(pathname);

  if (auth) {
    return (
      <div className="min-h-screen w-full" style={{ minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  if (isToolRoute(pathname)) {
    return (
      <div className="flex h-screen flex-col">
        <ExploreToolHeader />
        <main className="relative min-h-0 flex-1">{children}</main>
      </div>
    );
  }

  // Editorial-palette routes supply their own navigation and footer (HomeNav /
  // HomeFooter) on the cream/stone/ink tokens, so they render without TopNav,
  // PageContainer or the global Footer.
  //
  // EXACT MATCHES ONLY. "/projects" is here but "/projects/residential" is not:
  // the taxonomy archive routes under /projects/[...segments] still use the
  // existing shell and palette. Widening this to a prefix would restyle every
  // archive page unintentionally.
  if (EDITORIAL_ROUTES.has(pathname ?? "")) {
    return <>{children}</>;
  }

  // Everything under /projects/* and /products/* renders bare, because this client component
  // cannot tell a project DETAIL page from a CATEGORY ARCHIVE — both are served
  // by the same [...segments] catch-all, and only the server knows
  // which resolved. So the decision is inverted: shell-less by default here,
  // and the CategoryArchive components re-add TopNav/Footer for that branch.
  // Archives therefore render exactly as before; detail pages get the cream
  // editorial treatment. Note "/projects" itself is an exact match above.
  if (pathname?.startsWith("/projects/") || pathname?.startsWith("/products/")) {
    return <>{children}</>;
  }

  // /magazine/[slug] renders its own HomeNav/HomeFooter. Unlike the two above,
  // there are no category archives under /magazine, so this prefix is
  // unambiguous — every child route is an article.
  if (pathname?.startsWith("/magazine/")) {
    return <>{children}</>;
  }

  // /inspiration/[slug] collection landing pages, same reasoning as /magazine/:
  // every child route is a collection, so the prefix is unambiguous.
  if (pathname?.startsWith("/inspiration/")) {
    return <>{children}</>;
  }

  if (isFullWidthRoute(pathname)) {
    return (
      <>
        <TopNav />
        <main>{children}</main>
      </>
    );
  }

  if (isStaticPageRoute(pathname)) {
    return (
      <>
        <TopNav />
        <main className="min-h-screen bg-cream font-body text-ink">
          <PageContainer>{children}</PageContainer>
        </main>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <main>
        <PageContainer>{children}</PageContainer>
      </main>
    </>
  );
}

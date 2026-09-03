"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { isCorporateRoute } from "@/lib/layout/corporateRoutes";
import { PageContainer } from "@/components/layout/PageContainer";
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
  // Universal search renders DirectoryPageShell, which brings its own
  // HomeNav and HomeFooter — the same arrangement as the directories below.
  "/search",
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

  // ── SIGNED-IN SURFACES THAT RENDER THEIR OWN HomeNav ──────────────────────
  // These four were rendering it INSIDE the default shell, which meant each
  // page drew two headers: TopNav first, then a fixed-position HomeNav on top
  // of it. The duplicate was invisible — HomeNav is `fixed top-0 z-50`, so it
  // covered TopNav exactly — which is why it survived review.
  //
  // The visible symptom was width, not chrome. PageContainer wraps children in
  // Container, which caps content at 1040px; each page then applied its own
  // lg:px-24 inside that, leaving roughly 650px of usable width on a 1440px
  // viewport. The dashboard looked like a narrow left column with a large empty
  // area beside it, and no amount of grid work inside the page could fix it.
  //
  // /me/listings joins them in this pass, restyled off the zinc palette.
  // The rest of /me/* still renders TopNav deliberately — see the consolidation
  // note in the PR; converting them is a separate, larger job.
  "/me/dashboard",
  "/me/listings",
  "/me/profile",
  "/me/files",
  // /me/saved was missing and had BOTH symptoms described above: TopNav plus
  // its own fixed HomeNav painted over it, and Container capping the workspace
  // at 1040px so the 280px rail left ~656px for a five-column grid. Measured in
  // a headless browser at 1600px before the fix: aside at x=312, main column
  // 656px, cards 118px wide. It is the sibling of /me/files and belongs here
  // for the same reason.
  "/me/saved",

  // ── THE /me WORKSPACE ─────────────────────────────────────────────────────
  // These five now render inside MeWorkspaceShell's sidebar + top bar, mounted
  // once by (app)/me/layout.tsx. /me/dashboard and /me/listings were already
  // here; /me/settings was NOT, so it carried TopNav plus PageContainer's
  // 1040px cap — the same pair of symptoms /me/saved had. /me/messages and
  // /me/tools are new and would have inherited that default.
  "/me/settings",
  "/me/messages",
  "/me/tools",
]);

// Routes that show TopNav but skip PageContainer (full-width content).
const FULL_WIDTH_PATHS: string[] = [];

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

  // Public profiles render their own HomeNav/HomeFooter, like every other
  // redesigned public surface — /u/[username] and /u/id/[profileId].
  //
  // The /claim children are EXCLUDED: they render a bare form and rely on this
  // shell for their nav and footer, so sending them down the shell-less branch
  // would leave a claim flow floating on a blank page.
  if (pathname?.startsWith("/u/") && !pathname.endsWith("/claim")) {
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

  /*
   * ── CORPORATE PAGES USE THE CURRENT HEADER AND FOOTER ─────────────────────
   * These rendered TopNav — a white bar with a bright-blue pill and a
   * dark-mode toggle — directly above a cream editorial page, and the legacy
   * zinc Footer underneath it. The page in between had already been migrated,
   * which made the seam at both ends the most visible thing on it.
   *
   * ── WHY THIS IS SAFE, AND WHY IT IS NOT A GLOBAL RESTYLE ──────────────────
   * TopNav is still rendered by the default branch below and by
   * /me/promote, /me/profile, MeWorkspaceShell, ProfilePageView,
   * ProjectCategoryArchive and DirectoryPageShell. None of them reach this
   * branch: the swap is keyed on CORPORATE_ROUTES, an exact-match set of
   * corporate routes. Restyling TopNav itself would have changed the
   * authenticated workspace, the archives and the listing flows — so it is
   * left completely alone.
   *
   * No navigation logic is duplicated either: HomeNav and HomeFooter are the
   * components the homepage, the directories and the profiles already use.
   *
   * pt-[72px] clears HomeNav, which is `fixed top-0`. Without it the first
   * heading renders under the header.
   */
  if (isCorporateRoute(pathname)) {
    return (
      <div className="min-h-screen bg-cream font-body text-ink">
        <HomeNav variant="solid" />
        <main className="pt-[72px]">
          <PageContainer>{children}</PageContainer>
        </main>
        <HomeFooter />
      </div>
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

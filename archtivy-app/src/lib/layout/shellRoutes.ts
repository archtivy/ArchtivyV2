/**
 * Which routes render their own chrome.
 *
 * ── WHY THIS IS ONE MODULE ──────────────────────────────────────────────────
 * SiteShell decides whether to draw TopNav + PageContainer; ConditionalFooter
 * decides whether to draw the global Footer. Both need the same answer to the
 * same question — "does this page supply its own header and footer?" — and
 * until now each kept its own copy of the list, joined by a comment reading
 * "Keep in sync with FOOTERLESS_ROUTES in ConditionalFooter, or a page gets two
 * footers." That comment was load-bearing, which is the problem: a route added
 * to one list and forgotten in the other renders two headers or two footers,
 * and the header case is invisible because HomeNav is opaque and fixed on top.
 *
 * One list, imported twice, is what makes the two decisions agree by
 * construction rather than by diligence.
 */

/**
 * Exact paths whose pages render SitePage (or their own HomeNav) and so must
 * receive no shell at all.
 *
 * EXACT MATCHES ONLY, deliberately. "/projects" is here but
 * "/projects/residential" is not: the taxonomy archives under
 * /projects/[...segments] are a different surface, and widening this to a
 * prefix would silently restyle every archive page.
 */
export const SHELL_LESS_ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/projects",
  "/products",
  "/designers",
  "/brands",
  "/magazine",
  "/inspiration",

  // The publish wizards render their own HomeNav on the cream palette. Left on
  // the legacy zinc TopNav they read as a blue admin form bolted onto an
  // editorial product.
  "/add/project",
  "/add/product",

  // Corporate / legal / policy. These were the one branch of SiteShell that
  // painted its own ground — a cream <main> wrapped around PageContainer,
  // because a page inside a container cannot paint full-bleed behind it. They
  // render MarketingPage (or their own SitePage) now, so the ground travels
  // with the page.
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

/**
 * Whole subtrees that render their own chrome.
 *
 * /me — every signed-in surface renders SitePage. The prefix replaced four
 * exact entries, one of which had been missing: /me/listings/[id]/edit renders
 * a wizard that draws its own HomeNav, so that route was serving two stacked
 * headers, the top one invisible because HomeNav is `fixed top-0 z-50` and
 * covered TopNav exactly. Converting subtrees wholesale is what prevents the
 * next one.
 *
 * /projects/ and /products/ — shell-less because a client component cannot
 * tell a project DETAIL page from a CATEGORY ARCHIVE; both are served by the
 * same [...segments] catch-all and only the server knows which resolved. The
 * decision is inverted there: bare by default, and the archive components
 * re-add what they need.
 *
 * /magazine/ and /inspiration/ — every child route is an article or a
 * collection, so unlike the two above the prefix is unambiguous.
 */
export const SHELL_LESS_PREFIXES: readonly string[] = [
  "/me",
  "/projects/",
  "/products/",
  "/magazine/",
  "/inspiration/",
];

export function isShellLess(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (SHELL_LESS_ROUTES.has(pathname)) return true;
  return SHELL_LESS_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`)
  );
}

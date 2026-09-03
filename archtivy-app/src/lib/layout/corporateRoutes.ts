/**
 * The corporate and informational routes, in one place.
 *
 * ── WHY THIS IS SHARED RATHER THAN COPIED ───────────────────────────────────
 * Two components need this list and they cannot import from each other:
 * SiteShell renders the header and footer for these pages, and
 * ConditionalFooter has to suppress the legacy global footer on exactly the
 * same set or every one of them ends with two footers.
 *
 * Until now that agreement was maintained by a comment asking the next person
 * to keep two literals in sync — the same arrangement that has already
 * produced a double-footer bug on this codebase more than once. One exported
 * set removes the possibility.
 *
 * EXACT MATCHES ONLY. These are leaf pages with no children; a prefix rule
 * would catch routes that are not corporate at all.
 */
export const CORPORATE_ROUTES: ReadonlySet<string> = new Set([
  "/about",
  "/vision",
  "/how-it-works",
  "/partners",
  "/contact",
  "/faq",
  "/guidelines",
  "/brand-intelligence",
  "/data-intelligence",
  // Legal and policy pages. They are reference documents rather than brand
  // pages, but they are read by the same visitor on the same site and should
  // not arrive wearing a different design.
  "/privacy",
  "/terms",
  "/cookies",
  "/data-processing",
]);

export function isCorporateRoute(pathname: string | null | undefined): boolean {
  return !!pathname && CORPORATE_ROUTES.has(pathname);
}

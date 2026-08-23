import type { ReactNode } from "react";
import { HomeNav } from "@/components/home/HomeNav";

/**
 * The standard interior page frame: cream ground, HomeNav, one measured column.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Pages that render HomeNav supply their own width, because HomeNav is
 * `fixed inset-x-0 top-0` and sits outside document flow — there is no shell
 * wrapper to inherit a container from, the way TopNav routes inherited
 * PageContainer. The first four converted routes each hand-rolled that wrapper
 * and immediately drifted: /me/dashboard and /me/listings landed on
 * `pb-20 pt-[104px]`, /me/profile and /me/files on `pb-24 pt-[120px]`. Two
 * pages a click apart, sixteen pixels out of step.
 *
 * With every remaining route moving onto HomeNav in this pass, that hand-rolled
 * wrapper would have been copied another thirty-odd times. The offsets live
 * here instead, so "clears the nav" is one fact in one place.
 */

/**
 * HomeNav is a 72px fixed bar. Every width adds the same 32px gap beneath it,
 * so content starts at a consistent optical distance from the hairline
 * regardless of which column a page chose.
 */
const NAV_OFFSET = "pt-[104px]";

const WIDTHS = {
  /** Default. Directories, dashboards, listings — the editorial 1440px column. */
  content: "mx-auto w-full max-w-content px-4 md:px-12 lg:px-24",
  /**
   * Working surfaces (the publish wizards) that want more canvas and tighter
   * gutters than a reading page. Matches what both wizards already used.
   */
  wide: "mx-auto w-full max-w-[1400px] px-5 md:px-10 lg:px-14",
  /**
   * Long-form prose — legal, policy, corporate copy. Capped near 70 characters
   * per line; the 1440px column is unreadable for continuous text.
   */
  prose: "mx-auto w-full max-w-[760px] px-4 md:px-6",
  /**
   * No column at all: the page paints its own full-bleed bands (a profile hero,
   * an edge-to-edge gallery) and containers each section itself. Still gets the
   * cream ground and the nav offset.
   */
  bleed: "w-full",
} as const;

export type SitePageWidth = keyof typeof WIDTHS;

interface SitePageProps {
  children: ReactNode;
  /** Column width. See WIDTHS above. Defaults to the editorial content column. */
  width?: SitePageWidth;
  /**
   * `solid` (default) — cream bar with a hairline, correct on any page whose
   * content starts below the nav.
   * `overlay` — transparent, turning solid on scroll. Only for pages that open
   * with a dark full-bleed hero behind the bar; on a cream page the cream
   * wordmark would render invisible.
   */
  navVariant?: "solid" | "overlay";
  /**
   * Extra classes on the column. Additive only — do not pass utilities that
   * collide with the ones set here (`pt-*`, `pb-*`, `max-w-*`, `px-*`). Two
   * competing Tailwind utilities are resolved by stylesheet order, not by
   * position in this string, so an override here would win or lose at random.
   * Need a different column? Add a width to WIDTHS.
   */
  className?: string;
}

export function SitePage({
  children,
  width = "content",
  navVariant = "solid",
  className = "",
}: SitePageProps) {
  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <HomeNav variant={navVariant} />
      <main className={`${WIDTHS[width]} ${NAV_OFFSET} pb-20 ${className}`.trim()}>
        {children}
      </main>
    </div>
  );
}

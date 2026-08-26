import Link from "next/link";
import type { HomeCategory } from "@/lib/db/homeCategories";

/**
 * Category pills inside the hero, on the dark surface.
 *
 * ── NOT A HARDCODED LIST ────────────────────────────────────────────────────
 * Labels and hrefs come from getHomeCategories(), which reads the live project
 * taxonomy and counts listings including descendants. The reference mockup
 * showed six labels — Residential, Commercial, Education, Hospitality,
 * Landscape/Urban, Cultural. All six exist as real top-level project nodes and
 * all six are populated, so they are what this renders today; but they are
 * rendered because the data says so, not because they were typed in. If a
 * category empties out it drops off on its own, and a new populated one appears
 * without a code change.
 *
 * ── EVERY PILL RETURNS RESULTS ──────────────────────────────────────────────
 * Filtered to listingCount > 0. A pill leading to an empty archive is a dead
 * end for a visitor and a thin page for a crawler; there are currently six
 * populated categories and eight empty ones, so this filter is doing real work
 * rather than guarding a theoretical case.
 *
 * Styling targets the dark hero specifically — cream-on-transparent with a
 * hairline border, rather than the light-surface pill treatment used by the
 * archive filters.
 */

export function HeroCategoryPills({
  categories,
  limit = 6,
}: {
  categories: HomeCategory[];
  limit?: number;
}) {
  const populated = categories.filter((c) => c.listingCount > 0).slice(0, limit);
  if (populated.length === 0) return null;

  return (
    <nav aria-label="Browse projects by category" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {populated.map((c) => (
          <li key={c.id}>
            <Link
              href={c.href}
              className="inline-flex items-center rounded-full border border-cream/25 px-4 py-2 font-body text-[13px] leading-[18px] text-cream/85 transition-colors hover:border-cream/60 hover:bg-cream/10 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream/70"
            >
              {c.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

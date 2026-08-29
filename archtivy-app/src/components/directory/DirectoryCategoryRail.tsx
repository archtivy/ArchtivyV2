import Link from "next/link";
import type { FacetValue } from "@/lib/db/projectsDirectory";

/**
 * Category navigation across a taxonomy's real roots. Shared by /projects and
 * /products; the caller supplies the facet values, the base path and the label
 * for the "all" entry, and nothing about the markup differs between them.
 *
 * ── SOURCE ──────────────────────────────────────────────────────────────────
 * `facets.buildingTypes` from getProjectsDirectory — the same root-level
 * taxonomy facet the filter panel uses, with the same counts, computed once
 * server-side. No second query and no hardcoded category list: the reference's
 * eight names include several this taxonomy does not have, and the counts
 * beside them are mockup figures. Six roots carry projects today.
 *
 * Each entry routes to /projects/{slug_path}, the canonical archive that
 * already exists, rather than filtering in place — so the destination is a
 * real indexable page rather than a client-side state change.
 *
 * ── NO ICONS ────────────────────────────────────────────────────────────────
 * The reference gives every category a glyph. There is no taxonomy icon
 * system in this codebase — no icon column on taxonomy_nodes, no icon map
 * anywhere — so drawing one here would mean inventing a second icon vocabulary
 * for one page and guessing which picture means "Public / Civic". The labels
 * and counts carry it instead.
 *
 * Scrolls horizontally below `md` rather than wrapping into a ragged grid.
 */
export function DirectoryCategoryRail({
  categories,
  total,
  basePath,
  allLabel,
  ariaLabel,
  activeSlug = null,
}: {
  categories: FacetValue[];
  total: number;
  /** "/projects" or "/products" — where the roots hang off. */
  basePath: string;
  allLabel: string;
  ariaLabel: string;
  /** Set on category archive pages; null on the hub itself. */
  activeSlug?: string | null;
}) {
  if (categories.length === 0) return null;

  const base =
    "flex shrink-0 flex-col justify-center rounded-lg px-5 py-3 font-body transition-colors";

  return (
    <nav aria-label={ariaLabel} className="rounded-xl border border-hairline p-2">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <Link
            href={basePath}
            aria-current={activeSlug === null ? "page" : undefined}
            className={`${base} ${
              activeSlug === null ? "bg-ink text-cream" : "text-ink hover:bg-stone/50"
            }`}
          >
            <span className="whitespace-nowrap text-[14px]">{allLabel}</span>
            <span
              className={`text-[13px] ${activeSlug === null ? "text-cream/70" : "text-muted"}`}
            >
              {total}
            </span>
          </Link>
        </li>

        {categories.map((c) => {
          const on = activeSlug === c.value;
          return (
            <li key={c.value}>
              <Link
                href={`${basePath}/${c.value}`}
                aria-current={on ? "page" : undefined}
                className={`${base} ${on ? "bg-ink text-cream" : "text-ink hover:bg-stone/50"}`}
              >
                <span className="whitespace-nowrap text-[14px]">{c.label}</span>
                <span className={`text-[13px] ${on ? "text-cream/70" : "text-muted"}`}>
                  {c.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

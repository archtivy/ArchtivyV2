import Link from "next/link";
import type { FacetValue } from "@/lib/db/projectsDirectory";

/**
 * Category navigation across the real project taxonomy roots.
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
export function ProjectsCategoryRail({
  categories,
  total,
  activeSlug = null,
}: {
  categories: FacetValue[];
  total: number;
  /** Set on category archive pages; null on /projects itself. */
  activeSlug?: string | null;
}) {
  if (categories.length === 0) return null;

  const base =
    "flex shrink-0 flex-col justify-center rounded-lg px-5 py-3 font-body transition-colors";

  return (
    <nav aria-label="Project categories" className="rounded-xl border border-hairline p-2">
      <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <Link
            href="/projects"
            aria-current={activeSlug === null ? "page" : undefined}
            className={`${base} ${
              activeSlug === null ? "bg-ink text-cream" : "text-ink hover:bg-stone/50"
            }`}
          >
            <span className="whitespace-nowrap text-[14px]">All Projects</span>
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
                href={`/projects/${c.value}`}
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

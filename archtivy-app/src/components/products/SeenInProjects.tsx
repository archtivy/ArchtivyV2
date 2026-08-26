import { EntityCard, initialsOf } from "@/components/home/EntityCard";
import type { ProductDetailProject } from "@/lib/db/productDetail";

/**
 * "Seen in Projects" — the real projects this product has been credited in.
 *
 * ── WHY THIS REPLACED TWO SURFACES, NOT ONE ─────────────────────────────────
 * The same relationship was rendered three times on this page:
 *   1. a "Projects" tab inside ProductDetailTabs
 *   2. a full-width "Projects Featuring This Product" section below the grid
 *   3. a "Projects featuring" count in the brand rail
 * (1) and (2) showed identical cards from identical data. This component is
 * now the single canonical surface, placed where (2) was — full width, below
 * the two-column grid — and (1) has been removed. The rail count in (3) stays:
 * it is a stat about the brand, not a second copy of the cards.
 *
 * Being specified in built work is the most persuasive thing about a product,
 * so it is a titled section rather than something behind a tab click.
 *
 * ── RENDERS NOTHING WHEN EMPTY ──────────────────────────────────────────────
 * Only 15 of 79 products have any project link (16 rows across 7 projects), so
 * an always-present section would be an empty state on the large majority of
 * product pages. Returning null matches how the Downloads tab is already
 * conditional, and means the section self-activates the first time a link is
 * added — no code change, no placeholder to clean up.
 *
 * The data is already fetched for the page (getProductDetail resolves it for
 * the brand rail's "Projects featuring" stat), so this adds no query.
 */
export function SeenInProjects({ projects }: { projects: ProductDetailProject[] }) {
  if (projects.length === 0) return null;

  return (
    <section
      id="seen-in-projects"
      aria-labelledby="seen-in-projects-heading"
      className="mt-20"
    >
      {/* Type scale and grid inherited from the section this replaces, so the
          page rhythm below the fold is unchanged. */}
      <h2
        id="seen-in-projects-heading"
        className="mb-6 font-display text-[24px] tracking-tight text-ink"
      >
        Seen in Projects
        <span className="ml-2.5 font-body text-[16px] text-muted">{projects.length}</span>
      </h2>

      <ul className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-4">
        {projects.map((p) => (
          <li key={p.id}>
            <EntityCard
              href={p.href}
              title={p.title}
              subtitle={p.architect}
              imageUrl={p.cover}
              imageCount={p.imageCount}
              avatarInitials={initialsOf(p.architect)}
              sizes="(max-width: 640px) 45vw, 22vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";

export interface SubcategoryLinkItem {
  label: string;
  slug_path: string;
  description: string | null;
  listing_count?: number;
}

interface SubcategoryLinksProps {
  /** "projects" or "products" — used to build hrefs. */
  baseSegment: "projects" | "products";
  items: SubcategoryLinkItem[];
  /** Section label. "Subcategories" below a root, "Related categories" beside a peer. */
  heading?: string;
}

/**
 * Internal links to sibling or child taxonomy nodes.
 *
 * ── ONLY CATEGORIES THAT LEAD SOMEWHERE ─────────────────────────────────────
 * The caller filters to nodes with at least one approved listing behind them
 * (their own or a descendant's). 505 of the 760 live project/product taxonomy
 * nodes are depth-2 product nodes and only 29 of those carry any listing, so an
 * unfiltered list here would be mostly links to empty pages — bad for a visitor
 * and worse as an internal-linking signal.
 *
 * The palette is the editorial one the rest of the directory uses. It was
 * zinc-200/white/#002abf, the last of which is not a token in this codebase at
 * all — it is the value that was corrected to #173DED in the design tokens.
 */
export function SubcategoryLinks({
  baseSegment,
  items,
  heading = "Subcategories",
}: SubcategoryLinksProps) {
  if (items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-body text-[11px] uppercase tracking-[0.12em] text-muted">
        {heading}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.slug_path}
            href={`/${baseSegment}/${item.slug_path}`}
            className="group block rounded-xl border border-hairline px-4 py-3 transition-colors hover:border-ink/30 hover:bg-stone/25"
          >
            <span className="block font-body text-[14px] text-ink">{item.label}</span>
            {item.description && (
              <span className="mt-0.5 block truncate font-body text-[12px] text-muted">
                {item.description}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

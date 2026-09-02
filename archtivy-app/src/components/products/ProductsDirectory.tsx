"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { DirectoryFilterBar } from "@/components/directory/DirectoryFilterBar";
import { CategoryCascadeFilter } from "@/components/directory/CategoryCascadeFilter";
import { SearchableFilterPanel } from "@/components/explore/filters/SearchableFilterPanel";
import type { CategoryTreeNode } from "@/lib/directory/categoryTree";
import {
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_SORTS,
  PRODUCT_TABS,
  countActiveProductFilters,
  serializeProductDirectoryState,
  type ProductDirectoryState,
  type ProductFilterState,
  type ProductSortKey,
  type ProductTabKey,
} from "@/lib/products/directoryParams";
import type { DirectoryProduct, ProductFacets } from "@/lib/db/productsDirectory";

/**
 * Products directory — the sibling of ProjectsDirectory, sharing its filter
 * bar, cascading category pill and facet pills rather than restating them.
 *
 * ── ITS FACETS ARE ITS OWN ──────────────────────────────────────────────────
 * Brand, Colour, Finish and Sustainability exist here and nowhere else;
 * Location, Project Type, Style, Status, Year and Size are project facts and
 * are absent. The two directories share a SHELL, not a facet set — there is no
 * forced parity where the data does not support it.
 *
 * ── URL IS THE STATE, AND THE SERVER READS IT ───────────────────────────────
 * Query, filters, sort and tab round-trip through the query string via
 * lib/products/directoryParams. The parsed state arrives as a PROP from the
 * server, not from useSearchParams: that hook opts a component out of server
 * rendering, which is what once left /projects?q=house serving an empty grid to
 * a crawler. Next re-renders the server component on every navigation, so the
 * prop updates on its own when this component pushes a new URL.
 *
 * ── THE CARD IS UNTOUCHED ───────────────────────────────────────────────────
 * ListingCardShared, with the full canonical model — taxonomy line, product
 * type, brand, brand logo chip, and the "Used in N projects / by N studios"
 * badge. Six columns are reached through the grid and its gutters; nothing
 * about the card's width, padding, ratio or type is overridden here, and no
 * directory-specific card variant exists.
 */

const NUMBER = new Intl.NumberFormat("en-US");
const PAGE = 24;

export function ProductsDirectory({
  products,
  facets,
  total,
  state,
  scope,
  categoryTree,
}: {
  products: DirectoryProduct[];
  facets: ProductFacets;
  total: number;
  /** Roots + their children, for the cascading Category pill. */
  categoryTree: CategoryTreeNode[];
  /** Parsed from the request URL on the server. */
  state: ProductDirectoryState;
  /** Set on a category archive, where the URL already fixes the category. */
  scope?: { slugPath: string; label: string; basePath: string } | null;
}) {
  const router = useRouter();
  const filterBtn = useRef<HTMLButtonElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const { filters, sort, tab } = state;
  const basePath = scope?.basePath ?? "/products";

  const write = useCallback(
    (next: Partial<ProductDirectoryState>, mode: "replace" | "push" = "replace") => {
      const qs = serializeProductDirectoryState({ ...state, ...next });
      router[mode](qs ? `${basePath}?${qs}` : basePath, { scroll: false });
      setShown(PAGE);
    },
    [router, state, basePath]
  );

  /*
   * Push for a discrete filter change so Back undoes it; replace while typing,
   * because one push per keystroke would bury the previous page under "c",
   * "ch", "cha". The query still lands in the URL on every keystroke, so the
   * address bar stays shareable throughout.
   */
  const setFilters = useCallback(
    (f: ProductFilterState) => write({ filters: f }, "push"),
    [write]
  );
  const setQuery = useCallback(
    (q: string) => write({ filters: { ...filters, q } }, "replace"),
    [write, filters]
  );

  const results = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();

    const out = products.filter((p) => {
      if (scope && !(p.taxonomySlugPath ?? "").startsWith(scope.slugPath)) return false;
      if (needle) {
        // The fields a visitor would expect "chair" to reach: name, brand,
        // category, product type and material names.
        const hay = [p.title, p.brand, p.categoryLabel, p.typeLabel, ...p.materialLabels]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (filters.categories.length && !filters.categories.includes(p.category ?? "")) return false;
      if (filters.brands.length && !filters.brands.includes(p.brandId ?? "")) return false;
      if (filters.colors.length && !p.colors.some((c) => filters.colors.includes(c))) return false;
      if (filters.materials.length && !p.materials.some((m) => filters.materials.includes(m)))
        return false;
      if (filters.finishes.length && !p.finishes.some((f) => filters.finishes.includes(f)))
        return false;
      if (
        filters.sustainability.length &&
        !p.sustainability.some((x) => filters.sustainability.includes(x))
      )
        return false;
      if (filters.usedInProjectsOnly && p.usedInProjects === 0) return false;
      return true;
    });

    /* "Most Viewed" narrows the ORDER, not the archive: products with no views
       yet keep their place at the end rather than disappearing. */
    if (tab === "viewed") {
      return [...out].sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
    }

    return [...out].sort((a, b) => {
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      if (sort === "used") return b.usedInProjects - a.usedInProjects;
      if (sort === "brand") return (a.brand ?? "").localeCompare(b.brand ?? "");
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [products, filters, sort, tab, scope]);

  const activeCount = countActiveProductFilters(filters);

  const toggle = (key: keyof ProductFilterState, value: string) => {
    const cur = filters[key] as string[];
    setFilters({
      ...filters,
      [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value],
    });
  };

  /** Active filters as individually removable chips. */
  const chips: { label: string; clear: () => void }[] = [];
  const listKeys = [
    ["categories", facets.categories],
    ["brands", facets.brands],
    ["materials", facets.materials],
    ["colors", facets.colors],
    ["finishes", facets.finishes],
    ["sustainability", facets.sustainability],
  ] as const;
  for (const [key, values] of listKeys) {
    for (const v of filters[key]) {
      chips.push({
        label: values.find((f) => f.value === v)?.label ?? v,
        clear: () => setFilters({ ...filters, [key]: filters[key].filter((x) => x !== v) }),
      });
    }
  }
  if (filters.usedInProjectsOnly) {
    chips.push({
      label: "Used in projects",
      clear: () => setFilters({ ...filters, usedInProjectsOnly: false }),
    });
  }

  const visible = results.slice(0, shown);

  return (
    <div>
      <DirectoryFilterBar
        // Null on an archive: ArchiveHeader above already owns that page h1.
        heading={scope ? null : "Products"}
        title="Products"
        countLabel={`${NUMBER.format(results.length)} ${results.length === 1 ? "product" : "products"} found`}
        q={filters.q}
        onQueryChange={setQuery}
        searchPlaceholder="Search products, brands, materials, finishes…"
        searchLabel="Search products"
        sortOptions={PRODUCT_SORTS}
        sort={sort}
        onSortChange={(v) => write({ sort: v as ProductSortKey }, "push")}
        chips={chips}
        onClearAll={() => setFilters(EMPTY_PRODUCT_FILTERS)}
        pills={
          <>
            <CategoryCascadeFilter
              tree={categoryTree}
              basePath="/products"
              allLabel="All Categories"
              activeSlugPath={scope?.slugPath ?? null}
            />

            {facets.brands.length > 0 && (
              <SearchableFilterPanel
                label="Brand"
                options={facets.brands.map((f) => ({ value: f.value, label: f.label }))}
                selected={filters.brands}
                onChange={(v) => setFilters({ ...filters, brands: v })}
                placeholder="Search brand…"
              />
            )}
            {facets.materials.length > 0 && (
              <SearchableFilterPanel
                label="Material"
                options={facets.materials.map((f) => ({ value: f.value, label: f.label }))}
                selected={filters.materials}
                onChange={(v) => setFilters({ ...filters, materials: v })}
                placeholder="Search material…"
              />
            )}
            {facets.colors.length > 0 && (
              <SearchableFilterPanel
                label="Colour"
                options={facets.colors.map((f) => ({ value: f.value, label: f.label }))}
                selected={filters.colors}
                onChange={(v) => setFilters({ ...filters, colors: v })}
                placeholder="Search colour…"
              />
            )}
            {facets.finishes.length > 0 && (
              <SearchableFilterPanel
                label="Finish"
                options={facets.finishes.map((f) => ({ value: f.value, label: f.label }))}
                selected={filters.finishes}
                onChange={(v) => setFilters({ ...filters, finishes: v })}
                placeholder="Search finish…"
              />
            )}
            {facets.sustainability.length > 0 && (
              <SearchableFilterPanel
                label="Sustainability"
                options={facets.sustainability.map((f) => ({ value: f.value, label: f.label }))}
                selected={filters.sustainability}
                onChange={(v) => setFilters({ ...filters, sustainability: v })}
                placeholder="Search sustainability…"
              />
            )}
            {facets.categories.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setFilters({ ...filters, usedInProjectsOnly: !filters.usedInProjectsOnly })
                }
                aria-pressed={filters.usedInProjectsOnly}
                className={[
                  "inline-flex h-10 shrink-0 items-center rounded-full border px-4 font-body text-[14px] transition-colors",
                  filters.usedInProjectsOnly
                    ? "border-ink bg-ink text-cream"
                    : "border-hairline text-ink hover:border-ink/30",
                ].join(" ")}
              >
                Used in projects
              </button>
            )}
          </>
        }
      />

      {/* ── Results header + tabs ───────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-hairline">
        <p className="font-body text-[15px] text-ink">
          {NUMBER.format(results.length)}
          {results.length !== total && (
            <span className="text-muted"> of {NUMBER.format(total)}</span>
          )}{" "}
          {results.length === 1 ? "Product" : "Products"}
        </p>

        {/* Featured and Most Saved are absent, not disabled — featured_slots
            does not exist and every save table is empty. See PRODUCT_TABS. */}
        <ul className="flex gap-6" role="tablist">
          {PRODUCT_TABS.map((t) => {
            const on = t.key === tab;
            return (
              <li key={t.key}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => write({ tab: t.key as ProductTabKey }, "push")}
                  className={[
                    "border-b-2 pb-3 font-body text-[14px] transition-colors",
                    on ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-body text-[12px] text-ink transition-colors hover:border-ink/30"
            >
              {c.label}
              <X strokeWidth={1.5} className="h-3 w-3 text-muted" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilters(EMPTY_PRODUCT_FILTERS)}
            className="font-body text-[12px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────────────
          Denser than the projects grid by one column, per the product mockup.
          The step-down is driven by what the canonical card stays readable at:
          a product card carries a two-part taxonomy line, a title, a brand and
          a logo chip, and below roughly 170px the title clamps to almost
          nothing. Six columns only appear at 2xl, where the container gives
          each card ~200px; at xl it is five, at lg four, at md three, and two
          on a phone. The card itself is never narrowed to make a column count
          fit. */}
      {visible.length === 0 ? (
        <p className="mt-12 font-body text-[14px] text-muted">
          {filters.q
            ? `No products match “${filters.q}”${activeCount > 0 ? " with these filters" : ""}.`
            : activeCount === 0 && scope
              /* A category with nothing in it yet is not a failed filter, and
                 saying "no products match these filters" when the visitor has set
                 none reads as a broken page. 677 of the 760 live taxonomy nodes
                 are currently empty, so this is the common case on an archive,
                 not an edge one. */
              ? `No products in ${scope.label} yet.`
              : "No products match these filters."}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {visible.map((p, i) => (
            <ListingCardShared
              key={p.id}
              model={{
                id: p.id,
                type: "product",
                title: p.title,
                href: p.href,
                imageUrl: p.cover,
                categoryLabel: p.categoryLabel,
                categoryHref: p.category ? `/products/${p.category}` : null,
                metaLabel: p.typeLabel,
                authorName: p.brand,
                authorHref: p.brandHref,
                logoUrl: p.brandAvatar,
                relatedCount: p.badge.related,
                ownerCount: p.badge.owners,
              }}
              ratio="1/1"
              priority={i < 6}
              sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 24vw, (max-width: 1536px) 19vw, 16vw"
            />
          ))}
        </div>
      )}

      {visible.length < results.length && (
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-3 font-body text-[14px] text-ink transition-colors hover:border-ink/30"
          >
            Load more
            <ChevronDown strokeWidth={1.5} className="h-4 w-4 text-muted" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

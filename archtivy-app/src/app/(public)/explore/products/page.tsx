import type { Metadata } from "next";
import { getProductsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters, countActiveFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreCountsHero } from "@/components/explore/ExploreCountsHero";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreSearchBar } from "@/components/search/ExploreSearchBar";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";

/** Filtered product views: noindex,follow so taxonomy values do not create indexable pages. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseExploreFilters(params, "products");
  const hasFilters = countActiveFilters(filters, "products") > 0;
  return hasFilters ? { robots: { index: false, follow: true } } : {};
}

export default async function ExploreProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseExploreFilters(params, "products");
  const productFilters = exploreFiltersToProductFilters(filters);

  const [result, options, networkCounts] = await Promise.all([
    getProductsCanonicalFiltered({
      filters: productFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc",
    }),
    getExploreFilterOptions("products"),
    getExploreNetworkCounts(),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  const cityDisplay = filters.city?.trim()
    ? filters.city.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <ExploreCountsHero counts={networkCounts} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 pt-4">
          <ExploreSearchBar type="products" currentFilters={filters} />

          {filters.q?.trim() && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Search results for: <span className="font-medium">&quot;{filters.q.trim()}&quot;</span>
            </p>
          )}

          <ExploreFilterBar
            type="products"
            currentFilters={filters}
            options={options}
            sort={filters.sort}
          />

          {isEmpty ? (
            <ExploreEmptyState
              type="products"
              cityName={cityDisplay}
              showResetAndFirst={!cityDisplay}
            />
          ) : (
            <ExploreProductsContent
              key={filterSortKey}
              initialData={initialData}
              initialTotal={total}
              filters={productFilters}
              sort={filters.sort as "newest" | "year_desc"}
            />
          )}
      </div>
    </div>
  );
}

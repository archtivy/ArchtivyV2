export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import { getProductsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters, countActiveFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { ExploreEditorialHeader } from "@/components/explore/ExploreEditorialHeader";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { Container } from "@/components/layout/Container";

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
      <ExploreEditorialHeader
        type="products"
        counts={networkCounts}
        options={options}
        currentFilters={filters}
      />

      <Container className="py-6">
        {filters.q?.trim() && (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Search results for:{" "}
            <span className="font-medium">&quot;{filters.q.trim()}&quot;</span>
          </p>
        )}

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
      </Container>
    </div>
  );
}

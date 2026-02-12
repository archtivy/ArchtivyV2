import type { Metadata } from "next";
import { getProductsCanonicalFiltered, getExploreStats } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters, countActiveFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreStatsStrip } from "@/components/explore/ExploreStatsStrip";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreSearchBar } from "@/components/search/ExploreSearchBar";
import { ExploreClearSearchLinks } from "@/components/explore/ExploreClearSearchLinks";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

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

  const [result, options, stats] = await Promise.all([
    getProductsCanonicalFiltered({
      filters: productFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc",
    }),
    getExploreFilterOptions("products"),
    getExploreStats("products"),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Explore products
          </h1>
          {stats != null && (
            <ExploreStatsStrip
              type="products"
              totalListings={stats.totalListings}
              totalConnections={stats.totalConnections}
            />
          )}
        </div>
        <Button as="link" href="/add/product" variant="primary">
          Add product
        </Button>
      </div>

      <ExploreSearchBar type="products" currentFilters={filters} className="mb-2" />

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
        <EmptyState
          title="No products match"
          description="Try changing filters or add a new product."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ExploreClearSearchLinks type="products" currentFilters={filters} />
              <Button as="link" href="/add/product" variant="primary">
                Add product
              </Button>
            </div>
          }
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
  );
}

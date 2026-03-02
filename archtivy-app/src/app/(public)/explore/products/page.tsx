import type { Metadata } from "next";
import { getProductsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters, countActiveFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { getPlatformStats } from "@/lib/db/platformActivity";
import { getProfilesForStrip } from "@/lib/db/profiles";
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

  const [result, options, networkCounts, platformStats, brandProfiles] = await Promise.all([
    getProductsCanonicalFiltered({
      filters: productFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc",
    }),
    getExploreFilterOptions("products"),
    getExploreNetworkCounts(),
    getPlatformStats(),
    getProfilesForStrip(["brand"], 18),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  const cityDisplay = filters.city?.trim()
    ? filters.city.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const brandStripItems = brandProfiles.map((b) => ({
    id: b.id,
    name: b.display_name ?? b.username ?? "Brand",
    logoUrl: b.avatar_url,
    locationText: null,
    href: `/u/${b.username ?? `id/${b.id}`}`,
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <ExploreEditorialHeader
        type="products"
        counts={networkCounts}
        options={options}
        currentFilters={filters}
        platformStats={platformStats}
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
            stripItems={brandStripItems}
          />
        )}
      </Container>
    </div>
  );
}

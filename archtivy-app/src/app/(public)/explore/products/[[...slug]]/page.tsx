import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProductsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters, countActiveFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { getPlatformStats } from "@/lib/db/platformActivity";
import { getProfilesForStrip } from "@/lib/db/profiles";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";
import { checkTaxonomySlugRedirect } from "@/lib/taxonomy/resolve";
import { legacySlugsToNodeId } from "@/lib/taxonomy/resolve";
import { getTaxonomyNodeById } from "@/lib/taxonomy/taxonomyDb";
import { ExploreEditorialHeader } from "@/components/explore/ExploreEditorialHeader";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { Container } from "@/components/layout/Container";

/** Filtered product views: noindex,follow so taxonomy values do not create indexable pages. */
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const taxonomySlug = slug?.length ? slug.join("/") : null;
  const filters = parseExploreFilters(sp, "products", taxonomySlug);
  const hasFilters = countActiveFilters(filters, "products") > 0;
  return hasFilters ? { robots: { index: false, follow: true } } : {};
}

export default async function ExploreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const taxonomySlug = slug?.length ? slug.join("/") : null;

  // Validate taxonomy slug exists in DB
  if (taxonomySlug) {
    const node = await getTaxonomyNodeBySlugPath("product", taxonomySlug);
    if (!node.data) {
      // Check for redirect (moved slug)
      const redir = await checkTaxonomySlugRedirect("product", taxonomySlug);
      if (redir) {
        const redirectParams = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (typeof v === "string") redirectParams.set(k, v);
        }
        const qs = redirectParams.toString();
        redirect(`/explore/products/${redir}${qs ? `?${qs}` : ""}`);
      }
      notFound();
    }
  }

  // Legacy 301 redirect: ?type=furniture&product_category=seating → /explore/products/furniture/seating
  const legacyType = typeof sp.type === "string" ? sp.type.trim() : null;
  const legacyCategory = typeof sp.product_category === "string" ? sp.product_category.trim() : null;
  const legacySub = typeof sp.sub === "string" ? sp.sub.trim() : null;
  if (!taxonomySlug && (legacyType || legacyCategory || legacySub)) {
    if (legacyType) {
      const nodeId = await legacySlugsToNodeId(legacyType, legacyCategory, legacySub);
      if (nodeId) {
        const nodeRes = await getTaxonomyNodeById(nodeId);
        if (nodeRes.data) {
          const cleanParams = new URLSearchParams();
          for (const [k, v] of Object.entries(sp)) {
            if (!["type", "product_category", "sub", "taxonomy"].includes(k) && typeof v === "string") {
              cleanParams.set(k, v);
            }
          }
          const qs = cleanParams.toString();
          redirect(`/explore/products/${nodeRes.data.slug_path}${qs ? `?${qs}` : ""}`);
        }
      }
    }
  }

  // Legacy ?taxonomy= redirect → path-based URL
  const rawTaxonomy = typeof sp.taxonomy === "string" ? sp.taxonomy.trim() : null;
  if (!taxonomySlug && rawTaxonomy) {
    const cleanParams = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "taxonomy") continue;
      if (typeof v === "string") cleanParams.set(k, v);
    }
    const qs = cleanParams.toString();
    redirect(`/explore/products/${rawTaxonomy}${qs ? `?${qs}` : ""}`);
  }

  // Fetch filter options (includes facet slugs for dynamic parsing)
  const options = await getExploreFilterOptions("products");
  const facetSlugs = options.facets.map((f) => f.slug);

  const filters = parseExploreFilters(sp, "products", taxonomySlug, facetSlugs);
  const productFilters = exploreFiltersToProductFilters(filters);

  const [result, networkCounts, platformStats, brandProfiles] = await Promise.all([
    getProductsCanonicalFiltered({
      filters: productFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc",
    }),
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

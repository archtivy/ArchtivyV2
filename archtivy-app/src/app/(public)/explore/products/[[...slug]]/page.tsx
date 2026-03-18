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
import { isLegacyType, resolveLegacyPath, isCanonicalProductSlugPath } from "@/lib/taxonomy/productTaxonomy";
import { ExploreEditorialHeader } from "@/components/explore/ExploreEditorialHeader";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { Container } from "@/components/layout/Container";
import { getBaseUrl } from "@/lib/canonical";
import { buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

/** Taxonomy pages are indexable with per-node SEO; filtered views are noindex,follow. */
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

  // Taxonomy slug page — use node SEO fields when available
  if (taxonomySlug) {
    const node = await getTaxonomyNodeBySlugPath("product", taxonomySlug);
    const n = node.data;
    if (n) {
      const title = n.seo_title || `${n.label} — Building Products | Archtivy`;
      const description =
        n.meta_description ||
        n.description ||
        `Browse ${n.label.toLowerCase()} building products on Archtivy.`;
      const meta: Metadata = {
        title,
        description,
        // Canonical points to the archive page; explore is a filtered view
        alternates: { canonical: `/products/${n.slug_path}` },
        robots: { index: false, follow: true },
        ...(n.featured_image ? { openGraph: { images: [n.featured_image] } } : {}),
      };
      return meta;
    }
  }

  // Base explore/products page
  const base: Metadata = {
    title: "Explore Products — Building Materials & Specifications | Archtivy",
    description:
      "Discover building products, materials, furniture, and specifications for architecture projects on Archtivy.",
    alternates: { canonical: "/explore/products" },
  };
  if (hasFilters) {
    return { ...base, robots: { index: false, follow: true } };
  }
  return base;
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

  // Validate taxonomy slug: accept if it exists in the canonical product taxonomy
  // (productTaxonomy.ts) OR in the DB taxonomy_nodes table.
  if (taxonomySlug) {
    const isCanonical = isCanonicalProductSlugPath(taxonomySlug);
    if (!isCanonical) {
      // Not in canonical taxonomy — check DB for legacy/project nodes or redirects
      const node = await getTaxonomyNodeBySlugPath("product", taxonomySlug);
      if (!node.data) {
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
  }

  // Legacy 301 redirect: ?type=furniture&product_category=seating → /explore/products/furniture/seating
  const legacyType = typeof sp.type === "string" ? sp.type.trim() : null;
  const legacyCategory = typeof sp.product_category === "string" ? sp.product_category.trim() : null;
  const legacySub = typeof sp.sub === "string" ? sp.sub.trim() : null;
  if (!taxonomySlug && (legacyType || legacyCategory || legacySub)) {
    if (legacyType) {
      const cleanParams = new URLSearchParams();
      for (const [k, v] of Object.entries(sp)) {
        if (!["type", "product_category", "sub", "taxonomy"].includes(k) && typeof v === "string") {
          cleanParams.set(k, v);
        }
      }
      const qs = cleanParams.toString();

      // Try DB-backed legacy lookup first
      const nodeId = await legacySlugsToNodeId(legacyType, legacyCategory, legacySub);
      if (nodeId) {
        const nodeRes = await getTaxonomyNodeById(nodeId);
        if (nodeRes.data) {
          redirect(`/explore/products/${nodeRes.data.slug_path}${qs ? `?${qs}` : ""}`);
        }
      }

      // Fallback: resolve retired types (fixtures-fittings, surfaces-materials, appliances)
      // via the frontend alias map, then look up the resolved type in the DB taxonomy tree
      if (isLegacyType(legacyType)) {
        const resolved = resolveLegacyPath(legacyType, legacyCategory, legacySub);
        // Build slug path from resolved: try deepest match first
        const slugCandidates = [
          `${resolved.type}/${resolved.category}/${resolved.subcategory}`,
          `${resolved.type}/${resolved.category}`,
          resolved.type,
        ];
        for (const candidate of slugCandidates) {
          const nodeRes = await getTaxonomyNodeBySlugPath("product", candidate);
          if (nodeRes.data) {
            redirect(`/explore/products/${nodeRes.data.slug_path}${qs ? `?${qs}` : ""}`);
          }
        }
        // If no exact match found, redirect to the resolved root type
        redirect(`/explore/products/${resolved.type}${qs ? `?${qs}` : ""}`);
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

  // Fetch taxonomy node for JSON-LD + intro_text (re-uses cached query if already fetched during validation)
  let taxonomyNode: import("@/lib/taxonomy/taxonomyDb").TaxonomyNode | null = null;
  if (taxonomySlug) {
    const nodeRes = await getTaxonomyNodeBySlugPath("product", taxonomySlug);
    taxonomyNode = nodeRes.data;
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

  const baseUrl = getBaseUrl();
  const collectionName = taxonomyNode
    ? (taxonomyNode.seo_title || `${taxonomyNode.label} — Building Products`)
    : "Building Products";
  const collectionDesc = taxonomyNode
    ? (taxonomyNode.meta_description || taxonomyNode.description || `Browse ${taxonomyNode.label.toLowerCase()} products.`)
    : "Discover building products, materials, furniture, and specifications on Archtivy.";
  const collectionUrl = taxonomyNode
    ? `${baseUrl}/explore/products/${taxonomyNode.slug_path}`
    : `${baseUrl}/explore/products`;
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: collectionName,
    description: collectionDesc,
    url: collectionUrl,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <ExploreEditorialHeader
        type="products"
        counts={networkCounts}
        options={options}
        currentFilters={filters}
        platformStats={platformStats}
      />

      {taxonomyNode?.intro_text && (
        <Container className="pt-4">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {taxonomyNode.intro_text}
          </p>
        </Container>
      )}

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

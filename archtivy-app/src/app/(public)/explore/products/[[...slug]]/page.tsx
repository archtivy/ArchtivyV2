import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProductsCanonicalFiltered } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProductFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { getProfilesForStrip } from "@/lib/db/profiles";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";
import { checkTaxonomySlugRedirect } from "@/lib/taxonomy/resolve";
import { legacySlugsToNodeId } from "@/lib/taxonomy/resolve";
import { getTaxonomyNodeById } from "@/lib/taxonomy/taxonomyDb";
import { isLegacyType, resolveLegacyPath, isCanonicalProductSlugPath } from "@/lib/taxonomy/productTaxonomy";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { ExploreProductsContent } from "@/components/explore/ExploreProductsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { PopularBrandsStrip } from "@/components/explore/PopularBrandsStrip";
import { Container } from "@/components/layout/Container";
import { getBaseUrl } from "@/lib/canonical";
import { buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { SitePage } from "@/components/layout/SitePage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxonomySlug = slug?.length ? slug.join("/") : null;

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
      return {
        title,
        description,
        // Canonical points to the archive page; explore is a filtered view
        alternates: { canonical: `/products/${n.slug_path}` },
        ...(n.featured_image ? { openGraph: { images: [n.featured_image] } } : {}),
      };
    }
  }

  // Base explore/products page
  const base: Metadata = {
    title: "Explore Products — Building Materials & Specifications | Archtivy",
    description:
      "Discover building products, materials, furniture, and specifications for architecture projects on Archtivy.",
    alternates: { canonical: "/explore/products" },
  };
  return base;
}

export default async function ExploreProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  const isLoggedIn = Boolean(userId);
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

  const [result, brandProfiles] = await Promise.all([
    getProductsCanonicalFiltered({
      filters: productFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc",
    }),
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
    <SitePage width="bleed" footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-hairline bg-cream">
        <Container>
          <div className="pb-5 pt-8 sm:pb-6 sm:pt-10">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-ink sm:text-4xl">
              Explore Products
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted">
              Products used in real projects and connected across a global network of people, brands, and ideas.
            </p>
            <p className="mt-2.5 text-xs text-muted">
              Sign in to access product files and connect with brands
            </p>
          </div>
        </Container>
      </header>

      {/* ── Access box (logged-out only) ───────────────────────────────── */}
      {!isLoggedIn && (
        <div className="border-b border-hairline bg-cream">
          <Container className="py-4">
            <div
              className="flex flex-col gap-3 border border-hairline/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderRadius: 6, backgroundColor: "#f6f7f8" }}
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  Unlock full access
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Contact brands and download product files
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/sign-in?redirect_url=/explore/products"
                  className="rounded border border-hairline bg-cream px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-zinc-400 hover:bg-stone/40"
                  style={{ borderRadius: 4 }}
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up?redirect_url=/explore/products"
                  className="rounded border border-hairline bg-cream px-3.5 py-1.5 text-xs font-medium text-ink transition hover:border-zinc-400 hover:bg-stone/40"
                  style={{ borderRadius: 4 }}
                >
                  Sign up
                </Link>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* ── Popular Brands Strip ───────────────────────────────────────── */}
      <PopularBrandsStrip items={brandStripItems} />

      {/* ── Taxonomy intro ─────────────────────────────────────────────── */}
      {taxonomyNode?.intro_text && (
        <Container className="pt-5">
          <p className="text-sm leading-relaxed text-muted">
            {taxonomyNode.intro_text}
          </p>
        </Container>
      )}

      {/* ── Main content: sidebar + grid ───────────────────────────────── */}
      <Container className="py-8">
        {filters.q?.trim() && (
          <p className="mb-5 text-sm text-muted">
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
            exploreFilters={filters}
            filterOptions={options}
          />
        )}
      </Container>
    </SitePage>
  );
}

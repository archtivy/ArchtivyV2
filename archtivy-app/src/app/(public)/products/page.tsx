export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProductsDirectory } from "@/lib/db/productsDirectory";
import { parseProductDirectoryState } from "@/lib/products/directoryParams";
import { isSearchResultUrl, toSearchParams } from "@/lib/discovery/indexation";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProductsDirectory } from "@/components/products/ProductsDirectory";
import { ProductsTrustStrip } from "@/components/products/ProductsTrustStrip";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /products — Directory/Search Layout archetype (Blueprint §8), the same
 * archetype as /projects: left filter rail + result grid/list, no right rail.
 *
 * Renders on the cream editorial palette with HomeNav/HomeFooter. "/products"
 * is an exact member of EDITORIAL_ROUTES in SiteShell and FOOTERLESS_ROUTES in
 * ConditionalFooter — sub-paths under /products/[...segments] keep the existing
 * shell, exactly as the project archives do.
 *
 * The previous category-hub UI is replaced; category browsing still lives at
 * /products/[...segments], which the Categories facet links into.
 *
 * SEO carried over unchanged: same canonical, same CollectionPage +
 * BreadcrumbList JSON-LD, same revalidate window.
 */

const BASE_METADATA: Metadata = {
  title: "Architecture Products — Browse by Category | Archtivy",
  description:
    "Explore architecture and design products by category: furniture, lighting, surfaces, and more. Discover products on Archtivy.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Architecture Products — Browse by Category | Archtivy",
    description:
      "Explore architecture and design products by category: furniture, lighting, surfaces, and more.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Products" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Architecture Products — Browse by Category | Archtivy",
    description: "Explore architecture and design products by category on Archtivy.",
    images: ["/og"],
  },
};

/**
 * ── INDEXATION ──────────────────────────────────────────────────────────────
 * /products is a canonical archive and stays indexable. /products with any
 * query on it is a result set a visitor assembled, and there is a
 * combinatorial number of those: `noindex, follow`, canonical still pointing
 * at the clean /products path. Identical to the rule on /projects — the logic
 * lives in lib/discovery/indexation so the two cannot drift.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (!isSearchResultUrl(sp)) return BASE_METADATA;
  return { ...BASE_METADATA, robots: { index: false, follow: true } };
}

export default async function ProductsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { products, facets, total } = await getProductsDirectory();

  /* Parsed on the SERVER, so /products?q=chair renders its results in the HTML
     rather than after hydration. */
  const state = parseProductDirectoryState(toSearchParams(sp));

  const canonicalUrl = getAbsoluteUrl("/products");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Architecture Products",
    description: "Browse architecture and design products by category on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: canonicalUrl },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      {/* solid: no dark hero behind the bar on this page. */}
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        {/* ── NO HERO BAND ───────────────────────────────────────────────
            Removed for the same reason as the projects one: the control bar is
            the page's entry point, and a stats-and-photograph band above it
            pushed the first product most of a viewport down. The h1 stays,
            because the band carried this page's only one. */}
        <h1 className="font-display text-[28px] leading-none tracking-tight text-ink sm:text-[32px]">
          Products
        </h1>

        <div className="mt-8">
          <ProductsDirectory
            products={products}
            facets={facets}
            total={total}
            state={state}
          />
        </div>

        <ProductsTrustStrip
          withDocuments={facets.withDocuments}
          total={total}
          brandsWithWebsite={facets.brandsWithWebsite}
        />
      </div>

      <HomeFooter />
    </div>
  );
}

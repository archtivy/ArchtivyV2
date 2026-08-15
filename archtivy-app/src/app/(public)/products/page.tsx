export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProductsDirectory } from "@/lib/db/productsDirectory";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProductsHeaderBand } from "@/components/products/ProductsHeaderBand";
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

export const metadata: Metadata = {
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

export default async function ProductsIndexPage() {
  const { products, facets, total } = await getProductsDirectory();

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
        <ProductsHeaderBand total={total} facets={facets} />

        <div className="mt-10">
          <ProductsDirectory products={products} facets={facets} />
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

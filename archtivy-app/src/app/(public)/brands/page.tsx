export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getBrandsDirectory } from "@/lib/db/brandsDirectory";
import { getPlatformTotals } from "@/lib/db/platformTotals";
import { getHeroFeature } from "@/lib/db/heroFeature";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { BrandsDirectory } from "@/components/brands/BrandsDirectory";
import { BrandsCtaBand } from "@/components/brands/BrandsCtaBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { HEADER_CLEARANCE } from "@/components/home/headerClearance";

/**
 * /brands — Directory/Search Layout archetype (Blueprint §8), fourth page on
 * the pattern. Replaces /explore/brands, which now 308-redirects here.
 *
 * Lists the 17 brand profiles that are public, non-hidden and non-deleted — not
 * the 48 that `role = 'brand' AND is_hidden = false` returns. See the
 * measurement table in lib/db/brandsDirectory.ts.
 */

export const metadata: Metadata = {
  title: "Brands — Design & Architecture Manufacturers | Archtivy",
  description:
    "Browse furniture, lighting, surface and building-systems brands on Archtivy. Filter by category, origin and brand type, and see the products behind each one.",
  alternates: { canonical: "/brands" },
  openGraph: {
    title: "Brands — Design & Architecture Manufacturers | Archtivy",
    description:
      "Browse furniture, lighting, surface and building-systems brands on Archtivy.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Brands" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brands — Design & Architecture Manufacturers | Archtivy",
    description: "Browse design and architecture brands on Archtivy.",
    images: ["/og"],
  },
};

export default async function BrandsIndexPage() {
  const [{ brands, facets, total }, totals, feature] = await Promise.all([
    getBrandsDirectory(),
    getPlatformTotals(),
    getHeroFeature(),
  ]);

  const canonicalUrl = getAbsoluteUrl("/brands");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Brands",
    description: "Design and architecture brands and manufacturers on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Brands", url: canonicalUrl },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <HomeNav variant="solid" />

      <div className={`mx-auto max-w-content px-4 ${HEADER_CLEARANCE} md:px-12 lg:px-24`}>
        <BrandsDirectory
          brands={brands}
          facets={facets}
          total={total}
          totals={totals}
          feature={feature}
        />
        <BrandsCtaBand />
      </div>

      <HomeFooter />
    </div>
  );
}

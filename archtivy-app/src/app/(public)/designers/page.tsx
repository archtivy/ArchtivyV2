export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getDesignersDirectory } from "@/lib/db/designersDirectory";
import { getPlatformTotals } from "@/lib/db/platformTotals";
import { getHeroFeature } from "@/lib/db/heroFeature";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { DesignersDirectory } from "@/components/designers/DesignersDirectory";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /designers — Directory/Search Layout archetype (Blueprint §8), the same
 * structure as /projects and /products: left filter rail, result grid/list,
 * no right rail.
 *
 * Replaces /explore/designers, which now 308-redirects here so there is one
 * canonical URL for the designer index rather than two competing ones. The nav
 * points here too.
 *
 * The population this lists is 24 public designer profiles, not the 153 that
 * `role = 'designer'` returns — see the measurement table in
 * lib/db/designersDirectory.ts for what the other 129 rows are and why they
 * are excluded.
 */

export const metadata: Metadata = {
  title: "Designers — Architects & Design Studios | Archtivy",
  description:
    "Browse architects, interior designers and studios on Archtivy. Filter by specialty and location, and see the projects behind each practice.",
  alternates: { canonical: "/designers" },
  openGraph: {
    title: "Designers — Architects & Design Studios | Archtivy",
    description:
      "Browse architects, interior designers and studios on Archtivy. Filter by specialty and location.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Designers" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Designers — Architects & Design Studios | Archtivy",
    description: "Browse architects, interior designers and studios on Archtivy.",
    images: ["/og"],
  },
};

export default async function DesignersIndexPage() {
  const [{ designers, facets, total }, totals, feature] = await Promise.all([
    getDesignersDirectory(),
    getPlatformTotals(),
    getHeroFeature(),
  ]);

  const canonicalUrl = getAbsoluteUrl("/designers");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Designers",
    description: "Architects, interior designers and studios on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Designers", url: canonicalUrl },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      {/* solid: no dark hero sits behind the bar on this page. */}
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <DesignersDirectory
          designers={designers}
          facets={facets}
          total={total}
          totals={totals}
          feature={feature}
        />
      </div>

      <HomeFooter />
    </div>
  );
}

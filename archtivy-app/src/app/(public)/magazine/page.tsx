export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getMagazineIndex } from "@/lib/db/articles";
import { getHeroFeature } from "@/lib/db/heroFeature";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { MagazineIndexView } from "@/components/magazine/MagazineIndexView";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /magazine — replaces the "coming soon" placeholder.
 *
 * NOINDEX IS A RUNTIME CHECK, NOT A FLAG. generateMetadata counts real
 * published articles and only allows indexing once at least one exists, so the
 * page self-corrects the moment the first article is published and nobody has
 * to remember to flip anything. An empty magazine never enters the index.
 */

export async function generateMetadata(): Promise<Metadata> {
  const { total } = await getMagazineIndex();
  const hasContent = total > 0;

  return {
    title: "Magazine — Design, Architecture & Ideas | Archtivy",
    description:
      "Stories on architecture, design, materials and people, written by the practitioners in the Archtivy archive and linked to the work they discuss.",
    // Derived from real content, per the technical spec §4.
    robots: hasContent ? undefined : { index: false, follow: true },
    alternates: { canonical: "/magazine" },
    openGraph: {
      title: "Archtivy Magazine",
      description: "Stories on architecture, design, materials and people.",
      images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Magazine" }],
    },
  };
}

export default async function MagazineIndexPage() {
  /*
   * Deliberately does NOT call auth(). Knowing whether the visitor is signed in
   * would only change one link's target, and calling auth() opts the whole page
   * out of static rendering. /add/article already redirects anonymous visitors
   * to sign-in with a redirect_url, so the unauthenticated path is handled
   * there — and this page stays static with ISR.
   */
  const [data, feature] = await Promise.all([getMagazineIndex(), getHeroFeature()]);

  const canonicalUrl = getAbsoluteUrl("/magazine");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Archtivy Magazine",
    description: "Stories on architecture, design, materials and people.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Magazine", url: canonicalUrl },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        <MagazineIndexView data={data} feature={feature} />
      </div>

      <HomeFooter />
    </div>
  );
}

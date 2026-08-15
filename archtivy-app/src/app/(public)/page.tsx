import type { Metadata } from "next";

export const revalidate = 3600; // ISR: revalidate every hour

import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { HomeNav } from "@/components/home/HomeNav";
import { HeroBand } from "@/components/home/HeroBand";
import { CategoryPillBar } from "@/components/home/CategoryPillBar";
import { FeaturedProjects } from "@/components/home/FeaturedProjects";
import { FindByConnection } from "@/components/home/FindByConnection";
import { FeaturedDesigners } from "@/components/home/FeaturedDesigners";
import { FeaturedBrands } from "@/components/home/FeaturedBrands";
import { Showcase, type ShowcaseItem } from "@/components/home/Showcase";
import { JoinArchtivy } from "@/components/home/JoinArchtivy";
import { HomeFooter } from "@/components/home/HomeFooter";
import { MaintenanceLanding } from "@/components/home/MaintenanceLanding";
import { getHomepagePromotedListingIds } from "@/lib/promote/campaigns";
import { getListingUrl } from "@/lib/canonical";
import { getBaseUrl } from "@/lib/canonical";
import { isMaintenanceMode } from "@/lib/maintenance";
import { buildHomepageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

const MAINTENANCE = isMaintenanceMode();

export const metadata: Metadata = MAINTENANCE
  ? {
      title: "Archtivy — Coming Soon",
      description:
        "Archtivy is preparing the intelligence layer of architecture. Check back soon.",
      openGraph: {
        siteName: "Archtivy",
        url: "/",
        title: "Archtivy — Coming Soon",
        description:
          "Archtivy is preparing the intelligence layer of architecture. Check back soon.",
        type: "website",
        images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Archtivy — Coming Soon",
        description:
          "Archtivy is preparing the intelligence layer of architecture. Check back soon.",
        images: ["/og"],
      },
      alternates: {
        canonical: "/",
      },
      // No `follow: false` here: nofollow on the only reachable page during
      // maintenance stops Google discovering anything at all. C-5.
    }
  : {
      title: "Archtivy — The Intelligence Layer of Architecture",
      description:
        "The platform where architectural work is documented, products are credited, and professionals connect across cities. Explore projects, products, designers, and brands.",
      openGraph: {
        // Page-level openGraph fully replaces the root layout's object, so
        // siteName and url must be restated here or they are dropped.
        siteName: "Archtivy",
        url: "/",
        title: "Archtivy — The Intelligence Layer of Architecture",
        description:
          "Explore architecture projects, building products, designers, and brands. Document work, credit specifications, and connect across cities.",
        type: "website",
        images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "Archtivy — The Intelligence Layer of Architecture",
        description:
          "Explore architecture projects, building products, designers, and brands.",
        images: ["/og"],
      },
      alternates: {
        canonical: "/",
      },
    };

/** Featured row (4) + showcase grid (up to 16 with load-more). */
const PROJECTS_LIMIT = 20;
const PRODUCTS_LIMIT = 20;

/** Root taxonomy segment, used to drive the showcase filter pills. */
function rootOf(slugPath: string | null | undefined): string | null {
  if (!slugPath) return null;
  return slugPath.split("/")[0] ?? null;
}

/**
 * Homepage — editorial cream direction (Archtivy Design Blueprint + Homepage
 * Build Brief).
 *
 * Renders WITHOUT SiteShell: SiteShell returns children bare for "/" and
 * ConditionalFooter suppresses the global footer there, because this page
 * supplies its own nav (HomeNav) and footer (HomeFooter) on the cream/ink
 * palette. Every other route is untouched.
 *
 * Sections 6 (Inspiration by Materials) and 9-left (From the Magazine) from the
 * brief are deliberately omitted from v1: material→project counts do not exist
 * at any meaningful scale, and there is no CMS behind the magazine. Shipping
 * either would mean fabricating figures or dead links.
 */
export default async function Home() {
  if (MAINTENANCE) {
    return <MaintenanceLanding />;
  }

  const [projects, products, promotedIds] = await Promise.all([
    getProjectsCanonical(PROJECTS_LIMIT),
    getProductsCanonical(PRODUCTS_LIMIT),
    getHomepagePromotedListingIds(),
  ]);

  // Promoted listings surface first, as before.
  const promotedSet = new Set(promotedIds);
  const sortPromoted = <T extends { id: string }>(items: T[]): T[] => [
    ...items.filter((i) => promotedSet.has(i.id)),
    ...items.filter((i) => !promotedSet.has(i.id)),
  ];

  const sortedProjects = sortPromoted(projects);
  const sortedProducts = sortPromoted(products);

  const projectItems: ShowcaseItem[] = sortedProjects.map((p) => ({
    id: p.id,
    href: getListingUrl({
      id: p.id,
      slug: p.slug,
      type: "project",
      taxonomySlugPath: p.taxonomy_slug_path ?? null,
    }),
    title: p.title,
    subtitle: p.owner?.displayName ?? null,
    location: p.location_text,
    imageUrl: p.cover,
    group: rootOf(p.taxonomy_slug_path),
  }));

  const productItems: ShowcaseItem[] = sortedProducts.map((p) => ({
    id: p.id,
    href: getListingUrl({
      id: p.id,
      slug: p.slug,
      type: "product",
      taxonomySlugPath: p.taxonomy_slug_path ?? null,
    }),
    title: p.title,
    subtitle: p.owner?.displayName ?? null,
    meta: p.taxonomy_label ?? p.category ?? null,
    imageUrl: p.cover,
    group: rootOf(p.taxonomy_slug_path),
  }));

  // Pills are built from the roots actually present in the data, so a filter
  // can never return an empty grid.
  const presentProjectRoots = new Set(
    projectItems.map((i) => i.group).filter(Boolean) as string[]
  );
  const presentProductRoots = new Set(
    productItems.map((i) => i.group).filter(Boolean) as string[]
  );

  const PROJECT_PILLS: { label: string; value: string | null }[] = [
    { label: "All Projects", value: null },
    { label: "Residential", value: "residential" },
    { label: "Hospitality", value: "hospitality" },
    { label: "Commercial", value: "commercial" },
    { label: "Cultural", value: "cultural" },
    { label: "Interior", value: "interior" },
    { label: "Landscape", value: "landscape-urban" },
  ].filter((f) => f.value === null || presentProjectRoots.has(f.value));

  const PRODUCT_PILLS: { label: string; value: string | null }[] = [
    { label: "All Products", value: null },
    { label: "Furniture", value: "furniture" },
    { label: "Lighting", value: "lighting" },
    { label: "Surfaces", value: "walls-ceilings-facades" },
    { label: "Bathroom", value: "bathroom" },
    { label: "Decor", value: "decor-accessories" },
    { label: "Outdoor", value: "outdoor" },
  ].filter((f) => f.value === null || presentProductRoots.has(f.value));

  const baseUrl = getBaseUrl();
  const jsonLdItems = buildHomepageJsonLd(baseUrl);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {jsonLdItems.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}

      <HomeNav />
      <HeroBand />
      <CategoryPillBar />

      <div className="mx-auto max-w-content px-4 md:px-12 lg:px-24">
        {/* §4 — Featured Projects + Find by Connection (70/30) */}
        <section className="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <FeaturedProjects projects={sortedProjects.slice(0, 4)} />
          </div>
          <div className="min-w-0 lg:col-span-4">
            <FindByConnection />
          </div>
        </section>

        {/* §5 — Featured Designers + Featured Brands (50/50) */}
        <section className="mt-24 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-8">
          <FeaturedDesigners />
          <FeaturedBrands />
        </section>

        {/* §7 — Projects Showcase */}
        <div className="mt-24">
          <Showcase
            title="Projects Showcase"
            viewAllHref="/projects"
            viewAllLabel="View all projects"
            items={projectItems}
            filters={PROJECT_PILLS}
          />
        </div>

        {/* §8 — Products Showcase */}
        <div className="mt-24">
          <Showcase
            title="Products Showcase"
            viewAllHref="/products"
            viewAllLabel="View all products"
            items={productItems}
            filters={PRODUCT_PILLS}
            ratio="1/1"
          />
        </div>

        {/* §9 — Join Archtivy */}
        <div className="mt-24">
          <JoinArchtivy />
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}

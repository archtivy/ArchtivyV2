import type { Metadata } from "next";

export const revalidate = 3600; // ISR: revalidate every hour

import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { HomeNav } from "@/components/home/HomeNav";
import { HeroBand } from "@/components/home/HeroBand";
import { DiscoverSection } from "@/components/home/DiscoverSection";
import { ConnectSection } from "@/components/home/ConnectSection";
import { PopularProfilesSection } from "@/components/home/PopularProfilesSection";
import { Showcase, type ShowcaseItem } from "@/components/home/Showcase";
import { JoinArchtivy } from "@/components/home/JoinArchtivy";
import { HomeFooter } from "@/components/home/HomeFooter";
import { MaintenanceLanding } from "@/components/home/MaintenanceLanding";
import { getHomepagePromotedListingIds } from "@/lib/promote/campaigns";
import { getMostConnected } from "@/lib/db/mostConnected";
import { getConnectChain } from "@/lib/db/connectShowcase";
import { getPopularProfiles } from "@/lib/db/popularProfiles";
import { projectToCardModel, productToCardModel } from "@/lib/cards/toListingCardModel";
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

  const [projects, products, promotedIds, mostConnected, connectChain, popular] =
    await Promise.all([
      getProjectsCanonical(PROJECTS_LIMIT),
      getProductsCanonical(PRODUCTS_LIMIT),
      getHomepagePromotedListingIds(),
      getMostConnected(),
      getConnectChain(),
      getPopularProfiles(),
    ]);

  /*
   * Canonical hrefs are resolved HERE, not inside DiscoverSection.
   *
   * That component is a client component (the tab strip is interactive), and
   * getListingUrl reads taxonomy data that belongs on the server. Passing
   * finished hrefs down keeps the URL rule in one place and keeps the client
   * bundle free of the canonical-URL module.
   */
  const discoverHrefById: Record<string, string> = {};
  for (const item of [...mostConnected.projects, ...mostConnected.products]) {
    discoverHrefById[item.id] = getListingUrl({
      id: item.id,
      slug: item.slug,
      type: item.type,
      taxonomySlugPath: item.taxonomySlugPath,
    });
  }

  // Promoted listings surface first, as before.
  const promotedSet = new Set(promotedIds);
  const sortPromoted = <T extends { id: string }>(items: T[]): T[] => [
    ...items.filter((i) => promotedSet.has(i.id)),
    ...items.filter((i) => !promotedSet.has(i.id)),
  ];

  const sortedProjects = sortPromoted(projects);
  const sortedProducts = sortPromoted(products);

  /*
   * ── THE SHOWCASES GET THE CANONICAL MODEL, VIA THE CANONICAL MAPPER ───────
   * This used to flatten each listing into a bespoke five-field shape — title,
   * subtitle, meta, location, imageUrl — which the Showcase then turned back
   * into a ListingCardModel. Everything with no slot in that shape was thrown
   * away here, one layer above the card: the category href, the studio logo,
   * the year and its filter link, the credit count, and the relationship badge.
   * Projects lost their taxonomy line outright, because only the PRODUCT branch
   * ever set `meta`.
   *
   * projectToCardModel / productToCardModel are the mappers /projects,
   * /products, the archives and the rails already go through, so the homepage
   * now draws the identical card by construction rather than by matching it.
   *
   * ── AND IT COSTS NOTHING EXTRA ────────────────────────────────────────────
   * No new query, and no N+1: getProjectsCanonical / getProductsCanonical
   * already attach `cardBadge` and `cardCreditCount` during their own batched
   * fan-out (explore.ts), and the mappers read them off the object. The data
   * for the badges was being fetched and discarded the whole time.
   */
  const projectItems: ShowcaseItem[] = sortedProjects.map((p) => ({
    model: projectToCardModel(p),
    group: rootOf(p.taxonomy_slug_path),
  }));

  const productItems: ShowcaseItem[] = sortedProducts.map((p) => ({
    model: productToCardModel(p),
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
      {/* The category pill strip that used to sit here has moved INTO the hero.
          Keeping it as well would have shown the same six categories twice, a
          few pixels apart, so the component was removed rather than restyled. */}
      <HeroBand />

      <div className="mx-auto max-w-content px-4 md:px-12 lg:px-24">
        {/* 01 — Discover, ranked by connection count */}
        <div className="mt-4">
          <DiscoverSection
            projects={mostConnected.projects}
            products={mostConnected.products}
            hrefById={discoverHrefById}
          />
        </div>

        {/* 02 — Connect: one real chain, selected from the graph */}
        <ConnectSection chain={connectChain} />

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
            /* Exactly five, in one row on desktop, with no Load more — "View
               all products" in the header is the way to the rest. */
            pageSize={5}
            loadMore={false}
            typeBadge
            /* Five across on large desktop, deliberately denser than the
               projects showcase above and than /products' own grid. Solved
               entirely in the grid container — see GRIDS in Showcase. */
            maxColumns={5}
          />
        </div>

        {/* 05 — Popular brands and designers (replaces the mockup's editorial band) */}
        <PopularProfilesSection brands={popular.brands} designers={popular.designers} />

        {/* §9 — Join Archtivy */}
        <div className="mt-24">
          <JoinArchtivy />
        </div>
      </div>

      <HomeFooter />
    </div>
  );
}

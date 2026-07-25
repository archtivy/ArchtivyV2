import type { Metadata } from "next";

export const revalidate = 3600; // ISR: revalidate every hour

import Link from "next/link";
import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { HomeHero } from "@/components/home/HomeHero";
import { LiveNetworkSection } from "@/components/home/LiveNetworkSection";
import { MaintenanceLanding } from "@/components/home/MaintenanceLanding";
import { getHomepagePromotedListingIds } from "@/lib/promote/campaigns";
import { NetworkFeedSection } from "@/components/home/NetworkFeedSection";
import { getBaseUrl } from "@/lib/canonical";
import { isProductionMaintenance } from "@/lib/maintenance";
import { buildHomepageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

const MAINTENANCE = isProductionMaintenance();

export const metadata: Metadata = MAINTENANCE
  ? {
      title: "Archtivy — Coming Soon",
      description:
        "Archtivy is preparing the intelligence layer of architecture. Check back soon.",
      openGraph: {
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
      robots: {
        index: true,
        follow: false,
      },
    }
  : {
      title: "Archtivy — The Intelligence Layer of Architecture",
      description:
        "The platform where architectural work is documented, products are credited, and professionals connect across cities. Explore projects, products, designers, and brands.",
      openGraph: {
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

const FEATURED_PROJECTS_LIMIT = 6;
const FEATURED_PRODUCTS_LIMIT = 8;

export default async function Home() {
  if (MAINTENANCE) {
    return <MaintenanceLanding />;
  }

  const [projects, products, promotedIds] = await Promise.all([
    getProjectsCanonical(FEATURED_PROJECTS_LIMIT),
    getProductsCanonical(FEATURED_PRODUCTS_LIMIT),
    getHomepagePromotedListingIds(),
  ]);

  // Surface promoted listings at the front of each section
  const promotedSet = new Set(promotedIds);
  const sortPromoted = <T extends { id: string }>(items: T[]): T[] => {
    const promoted = items.filter((i) => promotedSet.has(i.id));
    const rest = items.filter((i) => !promotedSet.has(i.id));
    return [...promoted, ...rest];
  };
  const sortedProjects = sortPromoted(projects);
  const sortedProducts = sortPromoted(products);

  const baseUrl = getBaseUrl();
  const jsonLdItems = buildHomepageJsonLd(baseUrl);

  return (
    <>
      {jsonLdItems.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(item) }}
        />
      ))}
      <HomeHero />
      <LiveNetworkSection />
      <div className="space-y-16 pb-24 sm:space-y-20 sm:pb-28">
        {/* Personalized network feed — client-side, only for signed-in users */}
        <NetworkFeedSection />

        {/* Featured Projects */}
        <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Featured Projects
          </h2>
          <Link
            href="/explore/projects"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eaeaea] bg-[#f6f6f6] px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200/80 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            View all →
          </Link>
        </div>
        {sortedProjects.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            No projects yet.{" "}
            <Link
              href="/add/project"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary dark:hover:opacity-90"
            >
              Add the first project
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Featured projects">
            {sortedProjects.map((p) => (
              <li key={p.id} className="h-full">
                <ProjectCardPremium project={p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Featured Products */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Featured Products
          </h2>
          <Link
            href="/explore/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eaeaea] bg-[#f6f6f6] px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200/80 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            View all →
          </Link>
        </div>
        {sortedProducts.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            No products yet.{" "}
            <Link
              href="/add/product"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary dark:hover:opacity-90"
            >
              Add the first product
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Featured products">
            {sortedProducts.map((p) => (
              <li key={p.id} className="h-full">
                <ProductCardPremium product={p} />
              </li>
            ))}
          </ul>
        )}
        </section>
      </div>
    </>
  );
}

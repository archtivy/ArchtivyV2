export const revalidate = 3600;

import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProjectsDirectory } from "@/lib/db/projectsDirectory";
import { getDirectoryCategoryTree } from "@/lib/directory/categoryTree";
import { parseDirectoryState, isSearchResultUrl } from "@/lib/projects/directoryParams";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { ProjectsDirectory } from "@/components/projects/ProjectsDirectory";
import { RequestProjectBand } from "@/components/projects/RequestProjectBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

/**
 * /projects — Directory/Search Layout archetype (Blueprint §8):
 * left filter rail + result grid/list. Deliberately NO right rail; that pattern
 * belongs to Search Results and Entity Detail pages (§21, and the brief's
 * closing note).
 *
 * On the editorial cream palette, with HomeNav/HomeFooter, per the brief's
 * recommendation to extend the homepage token scope across public discovery
 * surfaces. SiteShell and ConditionalFooter both treat "/projects" the same way
 * they treat "/".
 *
 * The previous category-hub UI (CategoryHubGrid) is replaced. Category browsing
 * still exists at /projects/[...segments], which the tab row and taxonomy links
 * feed into, so no navigation path is lost.
 *
 * SEO carried over unchanged from the hub version: same canonical, same
 * CollectionPage + BreadcrumbList JSON-LD, same revalidate window.
 */

const BASE_METADATA: Metadata = {
  title: "Architecture Projects — Browse by Category | Archtivy",
  description:
    "Explore architecture projects by category: residential, hospitality, commercial, cultural, and more. Discover built work on Archtivy.",
  alternates: { canonical: "/projects" },
  openGraph: {
    title: "Architecture Projects — Browse by Category | Archtivy",
    description:
      "Explore architecture projects by category: residential, hospitality, commercial, cultural, and more.",
    images: [{ url: "/og", width: 1200, height: 630, alt: "Archtivy Projects" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Architecture Projects — Browse by Category | Archtivy",
    description: "Explore architecture projects by category on Archtivy.",
    images: ["/og"],
  },
};

/**
 * ── INDEXATION ──────────────────────────────────────────────────────────────
 * /projects itself is a canonical archive and stays indexable. /projects with
 * ANY query on it — ?q=house, ?materials=wood&country=Italy — is a result set
 * a visitor assembled, and there is a combinatorial number of those. They are
 * `noindex, follow`: not indexed, because they duplicate each other and the
 * archive they were built from and would spread authority across thousands of
 * near-identical URLs; still followed, because the project links on them are
 * the same canonical detail URLs as everywhere else and should be crawled.
 *
 * The canonical tag stays on the clean /projects path either way, so whatever
 * equity a shared search URL attracts lands on the page that deserves it. The
 * rule keys on "is there a query at all" rather than a list of parameters, so
 * a filter added later cannot become indexable by being forgotten — see
 * isSearchResultUrl.
 *
 * Reading searchParams here makes this route dynamic. That is the cost of
 * emitting a correct robots tag per URL; the underlying data is still served
 * from getProjectsDirectory's unstable_cache, so the work per request is
 * rendering, not querying.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  if (!isSearchResultUrl(sp)) return BASE_METADATA;
  return {
    ...BASE_METADATA,
    robots: { index: false, follow: true },
  };
}

export default async function ProjectsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { projects, facets, total } = await getProjectsDirectory();
  // Roots restricted to those that actually carry projects — the same facet
  // the pill's "All Categories" list is measured against.
  const categoryTree = await getDirectoryCategoryTree(
    "project",
    facets.buildingTypes.map((f) => f.value)
  );

  /*
   * Parsed on the SERVER and handed down, so /projects?q=house renders its
   * results in the HTML rather than after hydration. The directory used to
   * read the query with useSearchParams, which opts a component out of server
   * rendering entirely — the grid sat behind a Suspense fallback and a crawler
   * saw an empty page.
   */
  const state = parseDirectoryState(
    new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) =>
        v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]]
      )
    )
  );

  const canonicalUrl = getAbsoluteUrl("/projects");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Architecture Projects",
    description: "Browse architecture projects by category on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: canonicalUrl },
  ]);

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      {/* solid: there is no dark hero behind the bar on this page. */}
      <HomeNav variant="solid" />

      <div className="mx-auto max-w-content px-4 pt-[92px] md:px-12 lg:px-24">
        {/* The h1 and the result count live in DirectoryFilterBar now, on one
            line as in the reference. The page deliberately renders no heading
            of its own — two h1s would be a document-outline regression. */}
        <div>
          <ProjectsDirectory
            projects={projects}
            facets={facets}
            total={total}
            categoryTree={categoryTree}
            state={state}
          />
        </div>

        <RequestProjectBand />
      </div>

      <HomeFooter />
    </div>
  );
}

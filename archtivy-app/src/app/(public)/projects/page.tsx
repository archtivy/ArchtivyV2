export const revalidate = 3600;

import { Suspense } from "react";
import type { Metadata } from "next";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getProjectsDirectory } from "@/lib/db/projectsDirectory";
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

export const metadata: Metadata = {
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

export default async function ProjectsIndexPage() {
  const { projects, facets, total } = await getProjectsDirectory();

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
        {/* ── NO HERO BAND ───────────────────────────────────────────────
            The stats-and-photograph band that used to open this page is gone;
            the control bar is the first thing under the nav now.

            A plain h1 stays. The band carried the page's ONLY h1, so removing
            it outright would have left /projects with no heading at all — a
            document-outline and SEO regression, not a layout simplification.
            This is the heading, not a hero: no image, no stat panel, no second
            search field. */}
        <h1 className="font-display text-[28px] leading-none tracking-tight text-ink sm:text-[32px]">
          Projects
        </h1>

        <div className="mt-8">
          {/* ProjectsDirectory reads its filter, sort and tab state from the
              query string, and useSearchParams opts a component out of static
              rendering unless a Suspense boundary marks where the client takes
              over. This page is statically rendered with revalidate=3600, so
              the boundary is what keeps the shell prerendered while the
              filtered grid hydrates from the URL. */}
          <Suspense
            fallback={<div className="min-h-[60vh]" aria-hidden />}
          >
            <ProjectsDirectory projects={projects} facets={facets} total={total} />
          </Suspense>
        </div>

        <RequestProjectBand />
      </div>

      <HomeFooter />
    </div>
  );
}

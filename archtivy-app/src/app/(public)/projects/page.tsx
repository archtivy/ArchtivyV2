export const revalidate = 3600;

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getTaxonomyTree, getChildNodes, getNodeListingCountsWithDescendants } from "@/lib/taxonomy/taxonomyDb";
import { Container } from "@/components/layout/Container";
import { ArchiveHeader } from "@/components/archive/ArchiveHeader";
import { CategoryHubGrid, type CategoryHubItem } from "@/components/archive/CategoryHubGrid";
import { ArchiveBreadcrumb } from "@/components/archive/ArchiveBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

const getCachedProjectCategories = unstable_cache(
  async (): Promise<CategoryHubItem[]> => {
    const [treeRes, countsRes] = await Promise.all([
      getTaxonomyTree("project"),
      getNodeListingCountsWithDescendants("project"),
    ]);
    const nodes = treeRes.data ?? [];
    const counts = countsRes.data ?? {};
    const topLevel = nodes.filter((n) => n.depth === 0);
    const childCountMap: Record<string, number> = {};
    for (const n of nodes) {
      if (n.parent_id) {
        childCountMap[n.parent_id] = (childCountMap[n.parent_id] ?? 0) + 1;
      }
    }
    return topLevel.map((n) => ({
      label: n.label,
      slug_path: n.slug_path,
      description: n.description,
      listing_count: counts[n.id] ?? 0,
      child_count: childCountMap[n.id] ?? 0,
    }));
  },
  ["archive:projects:hub"],
  { tags: [CACHE_TAGS.listings], revalidate: 3600 }
);

export const metadata: Metadata = {
  title: "Architecture Projects — Browse by Category | Archtivy",
  description:
    "Explore architecture projects by category: residential, hospitality, commercial, cultural, and more. Discover built work on Archtivy.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsHubPage() {
  const categories = await getCachedProjectCategories();

  const canonicalUrl = getAbsoluteUrl("/projects");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Architecture Projects",
    description:
      "Browse architecture projects by category on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: canonicalUrl },
  ]);

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={[]} current="Projects" />
      <ArchiveHeader
        title="Architecture Projects"
        intro="Browse architecture projects by category. From residential homes to cultural landmarks — discover built work from designers around the world."
      />
      <CategoryHubGrid baseSegment="projects" categories={categories} />
    </Container>
  );
}

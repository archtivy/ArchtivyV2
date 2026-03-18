export const revalidate = 3600;

import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getAbsoluteUrl } from "@/lib/canonical";
import { getTaxonomyTree, getNodeListingCountsWithDescendants } from "@/lib/taxonomy/taxonomyDb";
import { Container } from "@/components/layout/Container";
import { ArchiveHeader } from "@/components/archive/ArchiveHeader";
import { CategoryHubGrid, type CategoryHubItem } from "@/components/archive/CategoryHubGrid";
import { ArchiveBreadcrumb } from "@/components/archive/ArchiveBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

const getCachedProductCategories = unstable_cache(
  async (): Promise<CategoryHubItem[]> => {
    const [treeRes, countsRes] = await Promise.all([
      getTaxonomyTree("product"),
      getNodeListingCountsWithDescendants("product"),
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
  ["archive:products:hub"],
  { tags: [CACHE_TAGS.listings], revalidate: 3600 }
);

export const metadata: Metadata = {
  title: "Architecture Products — Browse by Category | Archtivy",
  description:
    "Explore architecture and design products by category: furniture, lighting, surfaces, and more. Discover products on Archtivy.",
  alternates: { canonical: "/products" },
};

export default async function ProductsHubPage() {
  const categories = await getCachedProductCategories();

  const canonicalUrl = getAbsoluteUrl("/products");
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: "Architecture Products",
    description:
      "Browse architecture and design products by category on Archtivy.",
    url: canonicalUrl,
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: canonicalUrl },
  ]);

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={[]} current="Products" />
      <ArchiveHeader
        title="Architecture Products"
        intro="Browse architecture and design products by category. From furniture and lighting to surfaces and architectural systems."
      />
      <CategoryHubGrid baseSegment="products" categories={categories} />
    </Container>
  );
}

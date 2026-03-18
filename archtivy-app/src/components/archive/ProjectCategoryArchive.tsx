import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveHubUrl, getArchiveCategoryUrl, buildArchiveBreadcrumbSegments } from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import type { ProjectCanonical } from "@/lib/canonical-models";
import { Container } from "@/components/layout/Container";
import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveBreadcrumb } from "./ArchiveBreadcrumb";
import { SubcategoryLinks, type SubcategoryLinkItem } from "./SubcategoryLinks";
import { ArchiveListingGrid } from "./ArchiveListingGrid";
import { ArchivePagination } from "./ArchivePagination";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface ProjectCategoryArchiveProps {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  children: SubcategoryLinkItem[];
  listings: ProjectCanonical[];
  total: number;
  page: number;
  totalPages: number;
}

export function ProjectCategoryArchive({
  node,
  ancestors,
  children,
  listings,
  total,
  page,
  totalPages,
}: ProjectCategoryArchiveProps) {
  const isSubcategory = node.depth > 0;
  const title = node.seo_title || `${node.label} Projects`;
  const intro = node.intro_text || node.description;

  const breadcrumbSegments = buildArchiveBreadcrumbSegments("project", ancestors, node.id);

  const archivePath = getArchiveCategoryUrl("project", node.slug_path);
  const canonicalUrl = getAbsoluteUrl(archivePath);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: title,
    description:
      node.meta_description ||
      node.description ||
      `Browse ${node.label.toLowerCase()} architecture projects on Archtivy.`,
    url: canonicalUrl,
  });
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl(getArchiveHubUrl("project")) },
    ...ancestors
      .filter((a) => a.id !== node.id)
      .map((a) => ({ name: a.label, url: getAbsoluteUrl(getArchiveCategoryUrl("project", a.slug_path)) })),
    { name: node.label, url: canonicalUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={breadcrumbSegments} current={node.label} />
      <ArchiveHeader title={title} intro={intro} count={total} />
      {!isSubcategory && children.length > 0 && (
        <SubcategoryLinks baseSegment="projects" items={children} />
      )}
      <ArchiveListingGrid type="project" items={listings} />
      <ArchivePagination
        currentPage={page}
        totalPages={totalPages}
        basePath={archivePath}
      />
    </Container>
  );
}

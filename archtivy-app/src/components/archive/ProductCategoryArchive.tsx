import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveHubUrl, getArchiveCategoryUrl, buildArchiveBreadcrumbSegments } from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import type { ProductCanonical } from "@/lib/canonical-models";
import { Container } from "@/components/layout/Container";
import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveBreadcrumb } from "./ArchiveBreadcrumb";
import { SubcategoryLinks, type SubcategoryLinkItem } from "./SubcategoryLinks";
import { ArchiveListingGrid } from "./ArchiveListingGrid";
import { ArchivePagination } from "./ArchivePagination";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface ProductCategoryArchiveProps {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  children: SubcategoryLinkItem[];
  listings: ProductCanonical[];
  total: number;
  page: number;
  totalPages: number;
}

export function ProductCategoryArchive({
  node,
  ancestors,
  children,
  listings,
  total,
  page,
  totalPages,
}: ProductCategoryArchiveProps) {
  const isSubcategory = node.depth > 0;
  const title = node.seo_title || `${node.label} Products`;
  const intro = node.intro_text || node.description;

  const breadcrumbSegments = buildArchiveBreadcrumbSegments("product", ancestors, node.id);

  const archivePath = getArchiveCategoryUrl("product", node.slug_path);
  const canonicalUrl = getAbsoluteUrl(archivePath);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: title,
    description:
      node.meta_description ||
      node.description ||
      `Browse ${node.label.toLowerCase()} products on Archtivy.`,
    url: canonicalUrl,
  });
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: getAbsoluteUrl(getArchiveHubUrl("product")) },
    ...ancestors
      .filter((a) => a.id !== node.id)
      .map((a) => ({ name: a.label, url: getAbsoluteUrl(getArchiveCategoryUrl("product", a.slug_path)) })),
    { name: node.label, url: canonicalUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <Container className="py-8 sm:py-12">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={breadcrumbSegments} current={node.label} />
      <ArchiveHeader title={title} intro={intro} count={total} />
      {!isSubcategory && children.length > 0 && (
        <SubcategoryLinks baseSegment="products" items={children} />
      )}
      <ArchiveListingGrid type="product" items={listings} />
      <ArchivePagination
        currentPage={page}
        totalPages={totalPages}
        basePath={archivePath}
      />
    </Container>
  );
}

import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveHubUrl, getArchiveCategoryUrl, buildArchiveBreadcrumbSegments } from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import type { ProductCanonical } from "@/lib/canonical-models";
import { SitePage } from "@/components/layout/SitePage";
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
  childNodes: SubcategoryLinkItem[];
  listings: ProductCanonical[];
  total: number;
  page: number;
  totalPages: number;
}

export function ProductCategoryArchive({
  node,
  ancestors,
  childNodes,
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

  /*
   * Renders its own frame.
   *
   * SiteShell treats everything under /products/* as shell-less, because that
   * catch-all serves BOTH category archives and product detail pages and a
   * client component cannot tell them apart — only this server branch knows.
   * The archive branch therefore supplies its own chrome. It used to re-add
   * TopNav and the global Footer to stay pixel-identical to the old shell;
   * now it renders SitePage, so archives and detail pages finally share one
   * header instead of two different ones on the same URL space.
   */
  return (
    <SitePage width="narrow" footer>
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={breadcrumbSegments} current={node.label} />
      <ArchiveHeader title={title} intro={intro} count={total} />
      {!isSubcategory && childNodes.length > 0 && (
        <SubcategoryLinks baseSegment="products" items={childNodes} />
      )}
      <ArchiveListingGrid type="product" items={listings} />
      <ArchivePagination
        currentPage={page}
        totalPages={totalPages}
        basePath={archivePath}
      />
    </SitePage>
  );
}

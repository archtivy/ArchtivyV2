import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveHubUrl, getArchiveCategoryUrl, buildArchiveBreadcrumbSegments } from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import { Container } from "@/components/layout/Container";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveBreadcrumb } from "./ArchiveBreadcrumb";
import { SubcategoryLinks, type SubcategoryLinkItem } from "./SubcategoryLinks";
import { ProductsDirectory } from "@/components/products/ProductsDirectory";
import type { ProductsDirectoryData } from "@/lib/db/productsDirectory";
import type { ProductDirectoryState } from "@/lib/products/directoryParams";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface ProductCategoryArchiveProps {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  childNodes: SubcategoryLinkItem[];
  total: number;
  /** Every live product plus its facets — the same payload /products uses. */
  directory: ProductsDirectoryData;
  /** Directory state parsed from the request URL on the server. */
  state: ProductDirectoryState;
}

export function ProductCategoryArchive({
  node,
  ancestors,
  childNodes,
  total,
  directory,
  state,
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
   * Renders its own TopNav and Footer — SiteShell and ConditionalFooter treat
   * everything under /products/* as shell-less, because that catch-all serves
   * both category archives and product detail pages and only this server
   * branch knows which resolved. Keeps archives pixel-identical to before.
   */
  return (
    <>
      <TopNav />
      <main>
        <Container className="py-8 sm:py-12">
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
          <ArchiveBreadcrumb segments={breadcrumbSegments} current={node.label} />
          <ArchiveHeader title={title} intro={intro} count={total} />
          {!isSubcategory && childNodes.length > 0 && (
            <SubcategoryLinks baseSegment="products" items={childNodes} />
          )}
          {/* ── ONE RESULTS UI ─────────────────────────────────────────
              The grid and pagination that used to sit here are gone. This
              page and /products drew product results differently, so the same
              archive looked like a different product depending on how you
              arrived. The results body is now ProductsDirectory — the same
              control bar, filter panel, category rail, tabs, canonical cards
              and Load more — scoped to this node.

              Everything that made this an ARCHIVE stays: the SEO title and
              intro from the taxonomy node, the breadcrumb, the subcategory
              links, the JSON-LD and the canonical URL.

              ArchivePagination goes with the grid: the directory ships every
              live product and reveals it with Load more, so a page-2 URL would
              paginate a set that is already fully present. */}
          <div className="mt-8">
            <ProductsDirectory
              products={directory.products}
              facets={directory.facets}
              total={directory.total}
              state={state}
              scope={{
                slugPath: node.slug_path,
                label: node.label,
                basePath: archivePath,
              }}
            />
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

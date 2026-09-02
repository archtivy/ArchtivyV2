import { getAbsoluteUrl } from "@/lib/canonical";
import {
  getArchiveHubUrl,
  getArchiveCategoryUrl,
  buildArchiveBreadcrumbSegments,
} from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import { DirectoryPageShell } from "@/components/directory/DirectoryPageShell";
import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveBreadcrumb } from "./ArchiveBreadcrumb";
import { SubcategoryLinks, type SubcategoryLinkItem } from "./SubcategoryLinks";
import { archiveIntro } from "@/lib/archive/copy";
import { ProductsDirectory } from "@/components/products/ProductsDirectory";
import { getDirectoryCategoryTree } from "@/lib/directory/categoryTree";
import type { ProductsDirectoryData } from "@/lib/db/productsDirectory";
import type { ProductDirectoryState } from "@/lib/products/directoryParams";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface ProductCategoryArchiveProps {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  childNodes: SubcategoryLinkItem[];
  /** Peers under the same parent that have listings. Empty on a root node. */
  siblingNodes: SubcategoryLinkItem[];
  /** Every live product plus its facets — the same payload /products uses. */
  directory: ProductsDirectoryData;
  /** Directory state parsed from the request URL on the server. */
  state: ProductDirectoryState;
}

/**
 * A product category archive: /products/furniture/beds-bedroom.
 *
 * The sibling of ProjectCategoryArchive and built the same way: chrome from
 * DirectoryPageShell, results from ProductsDirectory scoped to this node. See
 * the long note there for why the shell is mounted in the component rather
 * than in SiteShell, and what the two pages looked like before they shared it.
 *
 * ── NO TRUST STRIP HERE ─────────────────────────────────────────────────────
 * /products ends with ProductsTrustStrip ("29 of 76 products have specification
 * documents"). Those aggregates are platform-wide, and a platform-wide number
 * printed under a heading that says "Beds & Bedroom" reads as a claim about
 * beds. The strip is therefore not part of the shared shell; it stays on the
 * unscoped directory where its numbers are true. Related categories take its
 * place at the foot of a category page — real taxonomy, correctly scoped.
 */
export async function ProductCategoryArchive({
  node,
  ancestors,
  childNodes,
  siblingNodes,
  directory,
  state,
}: ProductCategoryArchiveProps) {
  // Fetched here rather than threaded through every archive route: this is a
  // server component and the tree is the same one /products builds.
  const categoryTree = await getDirectoryCategoryTree(
    "product",
    directory.facets.categories.map((f) => f.value)
  );

  const isSubcategory = node.depth > 0;
  const title = node.seo_title || `${node.label} Products`;
  const description = archiveIntro("product", node);
  // Only authored copy renders above the results — see the note in the project
  // archive. The generated sentence is for the meta description.
  const intro = node.intro_text || node.description;

  // Children that lead somewhere. Only 29 of the 505 live depth-2 product nodes
  // carry an approved listing, so an unfiltered list here would be a wall of
  // links to empty archives.
  const populatedChildren = childNodes.filter((c) => (c.listing_count ?? 0) > 0);

  const breadcrumbSegments = buildArchiveBreadcrumbSegments("product", ancestors, node.id);

  const archivePath = getArchiveCategoryUrl("product", node.slug_path);
  const canonicalUrl = getAbsoluteUrl(archivePath);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: title,
    description,
    url: canonicalUrl,
  });
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Products", url: getAbsoluteUrl(getArchiveHubUrl("product")) },
    ...ancestors
      .filter((a) => a.id !== node.id)
      .map((a) => ({
        name: a.label,
        url: getAbsoluteUrl(getArchiveCategoryUrl("product", a.slug_path)),
      })),
    { name: node.label, url: canonicalUrl },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <DirectoryPageShell>
      <JsonLd schemas={[collectionJsonLd, breadcrumbJsonLd]} />
      <ArchiveBreadcrumb segments={breadcrumbSegments} current={node.label} />
      <ArchiveHeader title={title} intro={intro} />

      {!isSubcategory && populatedChildren.length > 0 && (
        <SubcategoryLinks baseSegment="products" items={populatedChildren} />
      )}

      <ProductsDirectory
        categoryTree={categoryTree}
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

      {/* AFTER the results, so the grid stays the page's primary content. */}
      {isSubcategory && siblingNodes.length > 0 && (
        <div className="mt-16">
          <SubcategoryLinks
            baseSegment="products"
            items={siblingNodes}
            heading="Related categories"
          />
        </div>
      )}
    </DirectoryPageShell>
  );
}

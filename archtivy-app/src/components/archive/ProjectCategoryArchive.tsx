import { getAbsoluteUrl } from "@/lib/canonical";
import { getArchiveHubUrl, getArchiveCategoryUrl, buildArchiveBreadcrumbSegments } from "@/lib/archive/urls";
import type { TaxonomyNode } from "@/lib/taxonomy/taxonomyDb";
import { Container } from "@/components/layout/Container";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { ArchiveHeader } from "./ArchiveHeader";
import { ArchiveBreadcrumb } from "./ArchiveBreadcrumb";
import { SubcategoryLinks, type SubcategoryLinkItem } from "./SubcategoryLinks";
import { ProjectsDirectory } from "@/components/projects/ProjectsDirectory";
import { getDirectoryCategoryTree } from "@/lib/directory/categoryTree";
import type { ProjectsDirectoryData } from "@/lib/db/projectsDirectory";
import type { DirectoryState } from "@/lib/projects/directoryParams";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCollectionPageJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";

interface ProjectCategoryArchiveProps {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  childNodes: SubcategoryLinkItem[];
  total: number;
  /** Every live project plus its facets — the same payload /projects uses. */
  directory: ProjectsDirectoryData;
  /** Directory state parsed from the request URL on the server. */
  state: DirectoryState;
}

/**
 * ── ONE RESULTS UI, NOT THREE ───────────────────────────────────────────────
 * The grid and pagination that used to sit here are gone. This page, /projects
 * and /explore/projects each rendered project results differently, so the same
 * archive looked like a different product depending on how you arrived. The
 * results body is now ProjectsDirectory — the same filter bar, category pill,
 * facet pills, tabs, canonical cards and Load more — scoped to this node.
 *
 * Everything that made this page an ARCHIVE stays: the SEO title and intro
 * from the taxonomy node, the breadcrumb, the subcategory links, the
 * CollectionPage and BreadcrumbList JSON-LD, and the canonical URL. Only the
 * way results are drawn changed.
 *
 * ArchivePagination goes with the grid. The directory ships every live project
 * to the client and reveals them with Load more, so a page-2 URL would now
 * paginate a set that is already fully present. Nothing is unreachable.
 */
export async function ProjectCategoryArchive({
  node,
  ancestors,
  childNodes,
  total,
  directory,
  state,
}: ProjectCategoryArchiveProps) {
  // Fetched here rather than threaded through every archive route: this is a
  // server component and the tree is the same one /projects builds.
  const categoryTree = await getDirectoryCategoryTree(
    "project",
    directory.facets.buildingTypes.map((f) => f.value)
  );

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

  /*
   * Renders its own TopNav and Footer.
   *
   * SiteShell and ConditionalFooter treat everything under /projects/* as
   * shell-less, because that catch-all serves BOTH category archives and
   * project detail pages and a client component cannot tell them apart — only
   * this server branch knows. Re-adding the shell here keeps archive pages
   * pixel-identical to how they rendered before, while the detail branch is
   * free to use the cream editorial palette.
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
            <SubcategoryLinks baseSegment="projects" items={childNodes} />
          )}
          <div className="mt-8">
            <ProjectsDirectory
              categoryTree={categoryTree}
              projects={directory.projects}
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

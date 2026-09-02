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
  /** Peers under the same parent that have listings. Empty on a root node. */
  siblingNodes: SubcategoryLinkItem[];
  /** Every live project plus its facets — the same payload /projects uses. */
  directory: ProjectsDirectoryData;
  /** Directory state parsed from the request URL on the server. */
  state: DirectoryState;
}

/**
 * A project category archive: /projects/commercial/showroom.
 *
 * ── IT IS /projects, SCOPED ─────────────────────────────────────────────────
 * The chrome is DirectoryPageShell — the same HomeNav, the same 1440px column,
 * the same HomeFooter that /projects renders. The results body is
 * ProjectsDirectory — the same filter bar, category pill, facet pills, tabs,
 * canonical card and Load more — with `scope` set to this node's slug_path.
 * There is no category-specific results UI, no category-specific card, and no
 * category-specific container; a reader arriving here from /projects should
 * notice the heading changed and nothing else.
 *
 * What makes it an ARCHIVE rather than the directory is everything above and
 * below the results: the taxonomy title and intro, the crawlable breadcrumb,
 * the subcategory links, the related peers, the CollectionPage and
 * BreadcrumbList JSON-LD, and the self-referencing canonical.
 *
 * ── WHY THE SHELL IS MOUNTED HERE AND NOT IN SiteShell ──────────────────────
 * /projects/* is shell-less in SiteShell and ConditionalFooter, because that
 * catch-all serves both archives and project detail pages and a client
 * component cannot tell which resolved. Only this server branch knows, so the
 * branch supplies its own chrome. It previously supplied the LEGACY TopNav,
 * Container and Footer — which is the entire reason category pages looked like
 * a different product. Same mechanism, correct chrome.
 */
export async function ProjectCategoryArchive({
  node,
  ancestors,
  childNodes,
  siblingNodes,
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
  const description = archiveIntro("project", node);
  // Only real, authored copy is shown ABOVE the results. The generated sentence
  // is honest but says nothing a visitor cannot see, so it earns its place in
  // the meta description and not in the page.
  const intro = node.intro_text || node.description;

  // Children that lead somewhere. Of the 103 live project subcategories only 15
  // have an approved listing behind them, so listing them all would mostly be
  // links to empty archives.
  const populatedChildren = childNodes.filter((c) => (c.listing_count ?? 0) > 0);

  const breadcrumbSegments = buildArchiveBreadcrumbSegments("project", ancestors, node.id);

  const archivePath = getArchiveCategoryUrl("project", node.slug_path);
  const canonicalUrl = getAbsoluteUrl(archivePath);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: title,
    description,
    url: canonicalUrl,
  });
  const breadcrumbItems = [
    { name: "Home", url: getAbsoluteUrl("/") },
    { name: "Projects", url: getAbsoluteUrl(getArchiveHubUrl("project")) },
    ...ancestors
      .filter((a) => a.id !== node.id)
      .map((a) => ({
        name: a.label,
        url: getAbsoluteUrl(getArchiveCategoryUrl("project", a.slug_path)),
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
        <SubcategoryLinks baseSegment="projects" items={populatedChildren} />
      )}

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

      {/* AFTER the results, so the grid stays the page's primary content. */}
      {isSubcategory && siblingNodes.length > 0 && (
        <div className="mt-16">
          <SubcategoryLinks
            baseSegment="projects"
            items={siblingNodes}
            heading="Related categories"
          />
        </div>
      )}
    </DirectoryPageShell>
  );
}

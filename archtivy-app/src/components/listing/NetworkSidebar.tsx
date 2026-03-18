"use client";

import Link from "next/link";
import { TeamList, type TeamListMember } from "./TeamList";
import { ProductList, type ProductListItem } from "./ProductList";
import { MaterialsList, type MaterialItem } from "./MaterialsList";
import { ArchitectNetwork, type ArchitectProjectCard } from "./ArchitectNetwork";
import { TeamMemberProjects, type TeamMemberWithProjectsData } from "./TeamMemberProjects";
import { CollaborationHints, type CollaborationPairData } from "./CollaborationHints";
import { projectExploreUrl } from "@/lib/exploreUrls";
import { TaxonomyTags, type TaxonomyCrumb, type TaxonomyMaterialTag, type TaxonomyFacetGroup } from "./TaxonomyTags";

export interface NetworkSidebarProps {
  teamMembers: TeamListMember[];
  usedProducts: ProductListItem[];
  materials: MaterialItem[];
  /** "Shared by" line above Team Members: display name of listing owner */
  sharedByDisplayName?: string | null;
  /** Profile URL for shared-by name (optional) */
  sharedByHref?: string | null;
  mapHref?: string | null;
  className?: string;
  /** Taxonomy data for sidebar tags */
  taxonomyTags?: {
    categoryCrumbs: TaxonomyCrumb[];
    materialNodes: TaxonomyMaterialTag[];
    facetGroups: TaxonomyFacetGroup[];
  };
  /** "More from this architect" — other projects by the same owner */
  architectProjects?: ArchitectProjectCard[];
  architectDisplayName?: string | null;
  architectProfileHref?: string | null;
  /** Team members with their other projects (for expandable project lists) */
  teamMembersWithProjects?: TeamMemberWithProjectsData[];
  /** Collaboration pairs — team members who worked together on multiple projects */
  collaborationPairs?: CollaborationPairData[];
  /** Map of profile_id -> username for collaboration hint links */
  collaborationUsernameMap?: Record<string, string | null>;
}

/**
 * Network sidebar: Team Members, Used Products, Materials,
 * plus network discovery: Architect projects, team member projects, collaboration hints.
 * White background, soft border, 4px radius, minimal separators, sticky on desktop.
 */
export function NetworkSidebar({
  teamMembers,
  usedProducts,
  materials,
  sharedByDisplayName,
  sharedByHref,
  mapHref,
  className = "",
  taxonomyTags,
  architectProjects = [],
  architectDisplayName,
  architectProfileHref,
  teamMembersWithProjects = [],
  collaborationPairs = [],
  collaborationUsernameMap = {},
}: NetworkSidebarProps) {
  const hasTeam = teamMembers.length > 0;
  const hasTeamWithProjects = teamMembersWithProjects.some((m) => m.projects.length > 0);
  const hasProducts = usedProducts.length > 0;
  const hasMaterials = materials.length > 0;
  const hasArchitectProjects = architectProjects.length > 0;
  const hasCollaboration = collaborationPairs.length > 0;
  const hasTaxonomy = taxonomyTags && (
    taxonomyTags.categoryCrumbs.length > 0 ||
    taxonomyTags.materialNodes.length > 0 ||
    taxonomyTags.facetGroups.some((g) => g.values.length > 0)
  );
  const hasAny = hasTeam || hasTeamWithProjects || hasProducts || hasMaterials || hasTaxonomy || hasArchitectProjects || hasCollaboration;

  if (!hasAny && !mapHref?.trim()) return null;

  const exploreUrlForMaterial = (slug: string) => projectExploreUrl({ materials: [slug] });

  // Track which sections rendered for border logic
  let sectionCount = 0;
  const sectionClass = () => {
    sectionCount++;
    return sectionCount > 1 ? "border-t border-zinc-100 pt-5 pb-5 dark:border-zinc-800" : "pb-5";
  };

  return (
    <aside
      className={"sticky top-6 self-start rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50 " + className}
      aria-label="Network"
    >
      {hasTaxonomy && taxonomyTags && (
        <section className={sectionClass()}>
          <TaxonomyTags
            listingType="project"
            categoryCrumbs={taxonomyTags.categoryCrumbs}
            materialNodes={taxonomyTags.materialNodes}
            facetGroups={taxonomyTags.facetGroups}
          />
        </section>
      )}

      {/* Team Members — with expandable project lists when available */}
      {hasTeamWithProjects ? (
        <section className={sectionClass()}>
          {sharedByDisplayName?.trim() && (
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Shared by{" "}
              {sharedByHref?.trim() ? (
                <Link href={sharedByHref} className="text-zinc-600 hover:text-[#002abf] dark:text-zinc-300 dark:hover:text-[#5b7cff] rounded">
                  {sharedByDisplayName.trim()}
                </Link>
              ) : (
                <span>{sharedByDisplayName.trim()}</span>
              )}
            </p>
          )}
          <TeamMemberProjects members={teamMembersWithProjects} />
        </section>
      ) : hasTeam ? (
        <section className={sectionClass()} aria-labelledby="network-team-heading">
          {sharedByDisplayName?.trim() && (
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              Shared by{" "}
              {sharedByHref?.trim() ? (
                <Link href={sharedByHref} className="text-zinc-600 hover:text-[#002abf] dark:text-zinc-300 dark:hover:text-[#5b7cff] rounded">
                  {sharedByDisplayName.trim()}
                </Link>
              ) : (
                <span>{sharedByDisplayName.trim()}</span>
              )}
            </p>
          )}
          <h2 id="network-team-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Team Members
          </h2>
          <TeamList members={teamMembers} />
        </section>
      ) : null}

      {/* Collaboration hints */}
      {hasCollaboration && (
        <section className={sectionClass()}>
          <CollaborationHints pairs={collaborationPairs} usernameMap={collaborationUsernameMap} />
        </section>
      )}

      {/* More from this architect */}
      {hasArchitectProjects && architectDisplayName && (
        <section className={sectionClass()}>
          <ArchitectNetwork
            displayName={architectDisplayName}
            profileHref={architectProfileHref ?? null}
            projects={architectProjects}
          />
        </section>
      )}

      {hasProducts && (
        <section className={sectionClass()} aria-labelledby="network-products-heading">
          <h2 id="network-products-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Used Products
          </h2>
          <ProductList items={usedProducts} />
        </section>
      )}

      {hasMaterials && (
        <section className={sectionClass()} aria-labelledby="network-materials-heading">
          <h2 id="network-materials-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Materials
          </h2>
          <MaterialsList materials={materials} exploreUrl={exploreUrlForMaterial} variant="pills" />
        </section>
      )}

      {mapHref?.trim() && (
        <div className="pt-4">
          <Link
            href={mapHref}
            className="inline-flex w-full items-center justify-center rounded border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:border-[#002abf] hover:text-[#002abf] hover:bg-[#002abf]/[0.03] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#5b7cff] dark:hover:text-[#5b7cff] dark:focus:ring-offset-zinc-950"
            style={{ borderRadius: 4 }}
          >
            Explore on Map
          </Link>
        </div>
      )}
    </aside>
  );
}

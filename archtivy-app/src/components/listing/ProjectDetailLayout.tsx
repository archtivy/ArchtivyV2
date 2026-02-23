"use client";

import * as React from "react";
import { ProjectHeroGallery } from "./ProjectHeroGallery";
import { ProjectDetailHeader } from "./ProjectDetailHeader";
import { NetworkSidebar } from "./NetworkSidebar";
import { ProjectDetailContent } from "./ProjectDetailContent";
import { LightboxGallery, type RelatedItem } from "@/components/gallery/LightboxGallery";
import type { MetaLinePart } from "./MetaLine";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
import type { UsedProductItem } from "./ProjectDetailContent";
import type { ProjectDocumentItem } from "./ProjectDetailContent";
import { projectExploreUrl } from "@/lib/exploreUrls";
import { MoreInCategoryBlock } from "./MoreInCategoryBlock";
import { FilesSection } from "@/components/files/FilesSection";
import { areaSqftToBucket } from "@/lib/exploreFilters";
import { getCityLabel, getOwnerProfileHref } from "@/lib/cardUtils";

export interface ProjectDetailLayoutProps {
  images: GalleryImage[];
  project: ProjectCanonical;
  usedProducts: UsedProductItem[];
  /** Resolved mentioned products (brand + product name; link when matched). */
  mentionedResolved?: { brand_name_text: string; product_name_text: string; productId?: string; productSlug?: string; productTitle?: string }[];
  teamWithProfiles: ListingTeamMemberWithProfile[] | null;
  documents: ProjectDocumentItem[];
  relatedItems: RelatedItem[];
  isSaved: boolean;
  currentPath: string;
  /** Optional: "Connected to 12 products and 4 professionals." */
  connectionLine?: string | null;
  /** Optional map URL for Explore on Map (e.g. from project.location lat/lng). */
  mapHref?: string | null;
  /** More in this category items. */
  moreInCategory?: { id: string; slug: string | null; title: string; thumbnail?: string | null; location?: string | null }[];
}

export function ProjectDetailLayout({
  images,
  project,
  usedProducts,
  mentionedResolved = [],
  teamWithProfiles,
  documents,
  relatedItems,
  isSaved,
  currentPath,
  connectionLine,
  mapHref,
  moreInCategory = [],
}: ProjectDetailLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const handleImageClick = React.useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const locationText =
    project.location_text?.trim() ||
    (project.location?.city && project.location?.country
      ? `${project.location.city}, ${project.location.country}`
      : null);

  const metadataParts: string[] = [];
  if (locationText) metadataParts.push(locationText);
  if (project.year != null && !Number.isNaN(project.year)) metadataParts.push(String(project.year));
  const metadataLine = metadataParts.join(" · ") || null;

  const cityShort = getCityLabel(project);
  const categoryTrim = project.category?.trim() ?? null;
  const areaSqft = project.area_sqft != null && !Number.isNaN(project.area_sqft) ? project.area_sqft : null;
  const areaBucket = areaSqft != null ? areaSqftToBucket(areaSqft) : null;
  const metaLineParts: MetaLinePart[] = [];
  if (cityShort) {
    metaLineParts.push({
      label: cityShort,
      href: projectExploreUrl({ city: cityShort, country: project.location?.country?.trim() ?? undefined }),
    });
  }
  if (project.year != null && !Number.isNaN(project.year)) {
    metaLineParts.push({ label: String(project.year), href: projectExploreUrl({ year: project.year }) });
  }
  if (categoryTrim) {
    metaLineParts.push({ label: categoryTrim, href: projectExploreUrl({ category: categoryTrim }) });
  }
  if (areaBucket) {
    metaLineParts.push({
      label: areaSqft != null ? `${Math.round(areaSqft)} sqft` : areaBucket,
      href: projectExploreUrl({ area_bucket: areaBucket }),
    });
  }

  const teamMembersFallback = project.team_members ?? [];
  const materials = project.materials ?? [];
  const teamForSidebar = (teamWithProfiles ?? []).map((m) => ({
    profile_id: m.profile_id,
    display_name: m.display_name ?? null,
    title: m.title ?? null,
    username: m.username ?? null,
    avatar_url: null,
  }));
  const fallbackTeam = teamMembersFallback.map((m, i) => ({
    profile_id: `fallback-${i}`,
    display_name: m.name?.trim() ?? null,
    title: m.role?.trim() ?? null,
    username: null,
    avatar_url: null,
  }));
  const allTeam = teamForSidebar.length > 0 ? teamForSidebar : fallbackTeam;

  return (
    <>
      <div className="w-full bg-white dark:bg-zinc-950">
        <div className="w-full pt-1 pb-8 sm:pt-2">
          {images.length > 0 && (
            <div className="mb-6">
              <ProjectHeroGallery
                images={images}
                onImageClick={handleImageClick}
                usedProductTeaser={
                  usedProducts.length > 0 && usedProducts[0].thumbnail
                    ? { src: usedProducts[0].thumbnail, alt: usedProducts[0].title }
                    : images.length > 4
                      ? { src: images[4].src, alt: images[4].alt }
                      : null
                }
              />
            </div>
          )}

          <ProjectDetailHeader
            title={project.title}
            entityId={project.id}
            currentPath={currentPath}
            isSaved={isSaved}
            metaLineParts={metaLineParts}
            authorDisplayName={project.owner?.displayName ?? null}
            authorHref={getOwnerProfileHref(project.owner) ?? null}
          />

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="min-w-0 lg:col-span-8">
              <ProjectDetailContent project={project} />
            </div>
            <div className="lg:col-span-4">
              <NetworkSidebar
                teamMembers={allTeam}
                usedProducts={usedProducts}
                materials={materials}
                sharedByDisplayName={project.owner?.displayName?.trim() ?? null}
                sharedByHref={getOwnerProfileHref(project.owner) ?? null}
                mapHref={mapHref}
              />
              <div className="mt-6">
                <FilesSection
                  raw={[]}
                  listingDocuments={documents.map((d) => ({ id: d.id, file_url: d.file_url, file_name: d.file_name }))}
                  listingId={project.id}
                  useDownloadApi
                />
              </div>
            </div>
          </div>
          {moreInCategory.length > 0 && (
            <MoreInCategoryBlock type="projects" items={moreInCategory} />
          )}
        </div>
      </div>

      <LightboxGallery
        images={images}
        listingTitle={project.title}
        context="project"
        relatedItems={relatedItems}
        entityType="project"
        entityId={project.id}
        entitySlug={project.slug ?? project.id}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        isSaved={isSaved}
        currentPath={currentPath}
        headerOverlay={{
          studioName: project.owner?.displayName ?? null,
          metaLine: metadataLine,
        }}
        nearbyLocation={{
          excludeListingId: project.id,
          city: project.location?.city ?? null,
          country: project.location?.country ?? null,
        }}
        team={project.team_members?.length ? project.team_members : null}
      />
    </>
  );
}

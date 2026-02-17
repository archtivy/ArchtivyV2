"use client";

import * as React from "react";
import { ProjectHeroGallery } from "./ProjectHeroGallery";
import { ProjectDetailHeader } from "./ProjectDetailHeader";
import { ProjectOverviewSidebar } from "./ProjectOverviewSidebar";
import { ProjectDetailContent } from "./ProjectDetailContent";
import { LightboxGallery, type RelatedItem } from "@/components/gallery/LightboxGallery";
import type { GalleryImage } from "@/lib/db/gallery";
import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";
import type { UsedProductItem } from "./ProjectDetailContent";
import type { ProjectDocumentItem } from "./ProjectDetailContent";

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

  const styleVal = (project as { style?: string | null }).style ?? null;

  const teamMembersFallback = project.team_members ?? [];
  const materials = project.materials ?? [];

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
          />

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="min-w-0 lg:col-span-8">
              <ProjectDetailContent
                project={project}
                usedProducts={usedProducts}
                teamWithProfiles={teamWithProfiles}
                documents={documents}
              />
            </div>
            <div className="lg:col-span-4">
              <ProjectOverviewSidebar
                category={project.category}
                year={project.year}
                areaSqft={project.area_sqft}
                style={styleVal}
                location={locationText}
                locationCity={project.location?.city ?? null}
                locationCountry={project.location?.country ?? null}
                connectionLine={connectionLine}
                mapHref={mapHref}
                owner={project.owner ?? null}
                teamWithProfiles={teamWithProfiles}
                teamMembersFallback={teamMembersFallback}
                materials={materials}
                documents={documents}
                usedProducts={usedProducts}
                mentionedItems={mentionedResolved}
              />
            </div>
          </div>
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

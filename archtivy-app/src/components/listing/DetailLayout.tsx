"use client";

import * as React from "react";
import { HeroGallery } from "./HeroGallery";
import { LightboxGallery, type RelatedItem } from "@/components/gallery/LightboxGallery";
import type { GalleryImage } from "@/lib/db/gallery";

export interface DetailLayoutProps {
  /** Hero + tiles; clicking opens lightbox */
  images: GalleryImage[];
  listingTitle: string;
  context: "project" | "product";
  relatedItems: RelatedItem[];
  entityType: "project" | "product";
  entityId: string;
  entitySlug: string;
  isSaved: boolean;
  currentPath: string;
  /** Below hero: save/share bar + location or brand line */
  headerBar: React.ReactNode;
  /** Optional strip below header (e.g. MatchesStrip) */
  belowHeader?: React.ReactNode;
  /** Main body: title + description (left), sidebar (right) */
  title: React.ReactNode;
  description: React.ReactNode;
  sidebar: React.ReactNode;
}

/**
 * Wraps detail page: hero gallery (with lightbox entry points), header bar, two-column body.
 * Connected/related content is shown ONLY inside the existing lightbox when opened.
 */
export function DetailLayout({
  images,
  listingTitle,
  context,
  relatedItems,
  entityType,
  entityId,
  entitySlug,
  isSaved,
  currentPath,
  headerBar,
  belowHeader,
  title,
  description,
  sidebar,
}: DetailLayoutProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const handleImageClick = React.useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  return (
    <>
      <div className="w-full">
        {/* Hero gallery: same entry points as before — opens existing lightbox */}
        {images.length > 0 && (
          <div className="mb-4">
            <HeroGallery images={images} onImageClick={handleImageClick} />
          </div>
        )}

        {/* Below hero: save/share + location or brand */}
        {headerBar}

        {belowHeader}

        {/* Main body: two columns */}
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <div className="space-y-4">
              {title}
              {description}
            </div>
          </div>
          <div className="lg:col-span-1">{sidebar}</div>
        </div>
      </div>

      {/* Existing fullscreen lightbox — structure unchanged; connected content inside */}
      <LightboxGallery
        images={images}
        listingTitle={listingTitle}
        context={context}
        relatedItems={relatedItems}
        entityType={entityType}
        entityId={entityId}
        entitySlug={entitySlug}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        isSaved={isSaved}
        currentPath={currentPath}
      />
    </>
  );
}

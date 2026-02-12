"use client";

import * as React from "react";
import { GalleryGrid } from "./GalleryGrid";
import { LightboxGallery, type RelatedItem } from "./LightboxGallery";
import type { GalleryImage } from "@/lib/db/gallery";

export interface GallerySectionProps {
  images: GalleryImage[];
  listingTitle: string;
  context: "project" | "product";
  relatedItems: RelatedItem[];
  entityType: "project" | "product";
  entityId: string;
  entitySlug: string;
  isSaved: boolean;
  currentPath: string;
}

export function GallerySection({
  images,
  listingTitle,
  context,
  relatedItems,
  entityType,
  entityId,
  entitySlug,
  isSaved,
  currentPath,
}: GallerySectionProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  const handleImageClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <GalleryGrid images={images} onImageClick={handleImageClick} />
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

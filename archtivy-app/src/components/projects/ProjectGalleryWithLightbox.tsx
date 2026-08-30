"use client";

import { useState } from "react";
import { Gallery, type GalleryImage } from "@/components/entity/Gallery";
import {
  ProjectLightbox,
  type LightboxCredit,
  type LightboxProduct,
} from "@/components/projects/ProjectLightbox";

/**
 * The project hero gallery, plus the lightbox it opens.
 *
 * ── WHY A WRAPPER RATHER THAN A CHANGED GALLERY ─────────────────────────────
 * entity/Gallery is shared by Project Detail, Product Detail and the
 * Professional profile. Teaching it about projects, credits, product links and
 * connection counts would push project-specific knowledge into a component two
 * other entity types render. So Gallery gained exactly one optional prop — a
 * click handler — and everything that is specifically a PROJECT lightbox lives
 * here, on the project side of the codebase.
 *
 * This is also the only client boundary the feature needs. ProjectDetailView
 * stays a server component and resolves all of this data in the queries it
 * already runs; nothing here fetches.
 */
export function ProjectGalleryWithLightbox({
  images,
  title,
  shareUrl,
  productsHref,
  connectionsHref,
  locationLabel,
  year,
  credits,
  products,
  productCount,
  connectionCount,
  listingId,
}: {
  images: GalleryImage[];
  title: string;
  shareUrl: string;
  productsHref: string;
  connectionsHref: string | null;
  locationLabel: string | null;
  year: number | null;
  credits: LightboxCredit[];
  products: LightboxProduct[];
  productCount: number;
  connectionCount: number;
  listingId: string;
}) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  return (
    <>
      <Gallery
        images={images}
        title={title}
        onImageClick={(i) => {
          setStartIndex(i);
          setOpen(true);
        }}
      />
      <ProjectLightbox
        open={open}
        onClose={() => setOpen(false)}
        startIndex={startIndex}
        images={images}
        title={title}
        shareUrl={shareUrl}
        productsHref={productsHref}
        connectionsHref={connectionsHref}
        locationLabel={locationLabel}
        year={year}
        credits={credits}
        products={products}
        productCount={productCount}
        connectionCount={connectionCount}
        listingId={listingId}
      />
    </>
  );
}

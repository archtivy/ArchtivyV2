"use client";

import { useState } from "react";
import { Gallery, type GalleryImage } from "@/components/entity/Gallery";
import { ProductLightbox, type ProductLightboxProps } from "@/components/products/ProductLightbox";

/**
 * The product hero gallery, plus the lightbox it opens.
 *
 * Mirrors ProjectGalleryWithLightbox exactly: entity/Gallery keeps its single
 * optional onImageClick prop, and everything product-specific stays on the
 * product side. ProductDetailView stays a server component and resolves all of
 * this from the query it already runs; nothing here fetches.
 */
export function ProductGalleryWithLightbox({
  images,
  title,
  ...rest
}: { images: GalleryImage[]; title: string } & Omit<
  ProductLightboxProps,
  "open" | "onClose" | "startIndex" | "images" | "title"
>) {
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
      <ProductLightbox
        open={open}
        onClose={() => setOpen(false)}
        startIndex={startIndex}
        images={images}
        title={title}
        {...rest}
      />
    </>
  );
}

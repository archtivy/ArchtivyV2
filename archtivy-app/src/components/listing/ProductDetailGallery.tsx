"use client";

import type { GalleryImage } from "@/lib/db/gallery";

const RADIUS = 4;
const GAP = 12;

export interface ProductDetailGalleryProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
}

export function ProductDetailGallery({
  images,
  onImageClick,
}: ProductDetailGalleryProps) {
  const count = images.length;
  if (count === 0) return null;

  const hero = images[0];
  const row2 = images.slice(1, 3);
  const row3 = images.slice(3, 7);
  const hasRow2 = row2.length > 0;
  const hasRow3 = row3.length > 0;

  return (
    <section className="w-full" aria-label="Gallery">
      {/* Hero */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        style={{ borderRadius: RADIUS }}
      >
        <img
          src={hero.src}
          alt={hero.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <button
          type="button"
          onClick={() => onImageClick(0)}
          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          aria-label={`View image 1: ${hero.alt}`}
        />
        <button
          type="button"
          onClick={() => onImageClick(0)}
          className="absolute bottom-3 right-3 z-10 rounded px-3 py-2 text-sm font-medium text-white/95 backdrop-blur-sm hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ backgroundColor: "rgba(0,0,0,0.4)", borderRadius: RADIUS }}
        >
          View all photos
        </button>
      </div>

      {/* Mobile-only: horizontal thumbnail strip */}
      <div className="mt-3 flex overflow-x-auto overflow-y-hidden pb-1 md:hidden">
        <div className="flex gap-2" style={{ minWidth: "min-content" }}>
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative h-[105px] w-[140px] shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
              style={{ borderRadius: RADIUS }}
            >
              <img
                src={img.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => onImageClick(i)}
                className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                aria-label={`View image ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row 2 */}
      {hasRow2 && (
        <div className="mt-3 hidden grid-cols-2 md:grid" style={{ gap: GAP }}>
          {row2.map((img, i) => {
            const idx = i + 1;
            return (
              <div
                key={img.id}
                className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onImageClick(idx)}
                  className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                  aria-label={`View image ${idx + 1}: ${img.alt}`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Row 3 */}
      {hasRow3 && (
        <div className="mt-3 hidden grid-cols-2 md:grid" style={{ gap: GAP }}>
          {row3.slice(0, 4).map((img, i) => {
            const idx = 3 + i;
            return (
              <div
                key={img.id}
                className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => onImageClick(idx)}
                  className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                  aria-label={`View image ${idx + 1}: ${img.alt}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

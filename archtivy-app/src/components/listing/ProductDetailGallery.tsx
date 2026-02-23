"use client";

import Image from "next/image";
import type { GalleryImage } from "@/lib/db/gallery";

const RADIUS = 4;
const GAP = 12;

const HERO_SIZES = "(max-width: 768px) 100vw, 65vw";
const STACK_SIZES = "(max-width: 768px) 50vw, 20vw";

function isOptimizedSrc(src: string): boolean {
  return typeof src === "string" && src.includes("supabase.co");
}

export interface ProductDetailGalleryProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
}

/**
 * Product detail gallery: hero (landscape), then 2 smaller in a row, optional third row.
 * 8px radius, subtle "View all photos" overlay on hero. Opens existing lightbox on click.
 */
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
  const heroOptimized = isOptimizedSrc(hero.src);

  return (
    <section className="w-full" aria-label="Gallery">
      {/* Hero: visible on all breakpoints */}
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        style={{ borderRadius: RADIUS }}
      >
        <button
          type="button"
          onClick={() => onImageClick(0)}
          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          aria-label={`View image 1: ${hero.alt}`}
        >
          <Image
            src={hero.src}
            alt={hero.alt}
            fill
            className="object-cover"
            style={{ objectPosition: "50% 50%" }}
            sizes={HERO_SIZES}
            quality={90}
            unoptimized={!heroOptimized}
            priority
            fetchPriority="high"
          />
        </button>
        <button
          type="button"
          onClick={() => onImageClick(0)}
          className="absolute bottom-3 right-3 rounded px-3 py-2 text-sm font-medium text-white/95 backdrop-blur-sm hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
            borderRadius: RADIUS,
          }}
        >
          View all photos
        </button>
      </div>

      {/* Mobile-only: horizontal thumbnail strip */}
      <div className="mt-3 flex overflow-x-auto overflow-y-hidden pb-1 md:hidden">
        <div className="flex gap-2" style={{ minWidth: "min-content" }}>
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onImageClick(i)}
              className="relative h-[105px] w-[140px] shrink-0 overflow-hidden rounded bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:bg-zinc-800"
              style={{ borderRadius: RADIUS }}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={img.src}
                alt=""
                fill
                className="object-cover"
                sizes="140px"
                unoptimized={!isOptimizedSrc(img.src)}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: two smaller, same height (desktop only) */}
      {hasRow2 && (
        <div
          className="mt-3 hidden grid-cols-2 gap-3 md:grid"
          style={{ gap: GAP }}
        >
          {row2.map((img, i) => {
            const idx = i + 1;
            const opt = isOptimizedSrc(img.src);
            return (
              <div
                key={img.id}
                className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS }}
              >
                <button
                  type="button"
                  onClick={() => onImageClick(idx)}
                  className="absolute inset-0 block h-full w-full focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                  aria-label={`View image ${idx + 1}: ${img.alt}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: "50% 50%" }}
                    sizes={STACK_SIZES}
                    quality={88}
                    unoptimized={!opt}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Row 3: optional — one wide or 2x2 */}
      {hasRow3 && (
        <div
          className="mt-3 hidden grid-cols-2 gap-3 md:grid"
          style={{ gap: GAP }}
        >
          {row3.slice(0, 4).map((img, i) => {
            const idx = 3 + i;
            const opt = isOptimizedSrc(img.src);
            return (
              <div
                key={img.id}
                className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS }}
              >
                <button
                  type="button"
                  onClick={() => onImageClick(idx)}
                  className="absolute inset-0 block h-full w-full focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                  aria-label={`View image ${idx + 1}: ${img.alt}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: "50% 50%" }}
                    sizes={STACK_SIZES}
                    quality={88}
                    unoptimized={!opt}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

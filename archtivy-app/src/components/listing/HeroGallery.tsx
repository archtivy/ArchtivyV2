"use client";

import Image from "next/image";
import Link from "next/link";
import type { GalleryImage } from "@/lib/db/gallery";

const HERO_SIZES = "(max-width: 768px) 100vw, 700px";
const STACK_SIZES = "(max-width: 768px) 100vw, 360px";

function isOptimizedSrc(src: string): boolean {
  return typeof src === "string" && src.includes("supabase.co");
}

export interface HeroGalleryProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
  /** Optional labels for right tiles, e.g. ["Interior", "Detail", "Exterior"]. Shown very subtly when provided. */
  tileLabels?: [string, string, string];
}

/**
 * Archtivy listing gallery: one hero left, three stacked right.
 * Optimized for HD hero, center-cropped tiles, minimal editorial look.
 */
export function HeroGallery({ images, onImageClick, tileLabels }: HeroGalleryProps) {
  const count = images.length;
  if (count === 0) return null;

  const hero = images[0];
  const stack = images.slice(1, 4);
  const hasStack = stack.length > 0;
  const heroOptimized = isOptimizedSrc(hero.src);

  const tileBorderClass =
    "border border-black/[0.06] dark:border-white/[0.08]";

  function PhotoTagMarkers({ img, index }: { img: GalleryImage; index: number }) {
    const markers = img.photoTags;
    if (!markers?.length) return null;
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {markers.map((tag, i) => {
          const label = tag.product_title?.trim() || "Tagged product";
          return (
            <Link
              key={`${tag.product_id}-${i}`}
              href={`/products/${tag.product_slug ?? tag.product_id}`}
              className="pointer-events-auto absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-archtivy-primary/90 text-white shadow-md transition hover:bg-archtivy-primary focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:border-zinc-800 dark:focus:ring-zinc-500"
              style={{ left: `${tag.x * 100}%`, top: `${tag.y * 100}%` }}
              aria-label={`View product: ${label}`}
              title={label}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-semibold" aria-hidden>+</span>
            </Link>
          );
        })}
      </div>
    );
  }

  if (!hasStack) {
    return (
      <section className="listing-gallery w-full" aria-label="Gallery">
        <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-[6px] bg-zinc-100 dark:bg-zinc-800 ${tileBorderClass}`}>
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-zinc-500 dark:focus:ring-offset-zinc-950"
            aria-label={`View image 1: ${hero.alt}`}
          >
            <Image
              src={hero.src}
              alt={hero.alt}
              fill
              className="object-cover"
              style={{ imageRendering: "auto", objectPosition: "50% 50%" }}
              sizes={HERO_SIZES}
              quality={90}
              unoptimized={!heroOptimized}
              priority
              fetchPriority="high"
            />
          </button>
          <PhotoTagMarkers img={hero} index={0} />
        </div>
      </section>
    );
  }

  return (
    <section className="listing-gallery w-full" aria-label="Gallery">
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[2fr_1fr] md:gap-3 lg:gap-[14px] md:items-stretch">
        {/* Left: hero — stable aspect on mobile, stretches on desktop */}
        <div className={`relative min-h-0 aspect-[4/3] w-full overflow-hidden rounded-[6px] bg-zinc-100 dark:bg-zinc-800 md:aspect-auto ${tileBorderClass}`}>
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="absolute inset-0 block h-full w-full focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:focus:ring-zinc-500 dark:focus:ring-offset-zinc-950"
            aria-label={`View image 1: ${hero.alt}`}
          >
            <Image
              src={hero.src}
              alt={hero.alt}
              fill
              className="object-cover"
              style={{ imageRendering: "auto", objectPosition: "50% 50%" }}
              sizes={HERO_SIZES}
              quality={90}
              unoptimized={!heroOptimized}
              priority
              fetchPriority="high"
            />
          </button>
          <PhotoTagMarkers img={hero} index={0} />
        </div>

        {/* Right: 3 stacked — center crop so project reads clearly */}
        <div className="grid grid-rows-3 gap-2.5 md:gap-3 lg:gap-[14px] md:aspect-[1/1.2] md:min-h-0">
          {stack.map((img, i) => {
            const idx = i + 1;
            const isLast = i === stack.length - 1;
            const showOverlay = isLast;
            const label = tileLabels?.[i];
            const stackOptimized = isOptimizedSrc(img.src);
            return (
              <div
                key={img.id}
                className="relative min-h-0 aspect-[4/3] md:aspect-auto"
              >
                <button
                  type="button"
                  onClick={() => (showOverlay ? onImageClick(0) : onImageClick(idx))}
                  className={`absolute inset-0 block h-full w-full overflow-hidden rounded-[6px] bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 dark:bg-zinc-800 dark:focus:ring-zinc-500 dark:focus:ring-offset-zinc-950 ${tileBorderClass}`}
                  aria-label={showOverlay ? `Show all ${count} photos` : `View image ${idx + 1}: ${img.alt}`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    className="object-cover"
                    style={{ imageRendering: "auto", objectPosition: "50% 50%" }}
                    sizes={STACK_SIZES}
                    quality={90}
                    unoptimized={!stackOptimized}
                  />
                  {label && (
                    <span
                      className="absolute left-2 top-2 text-[11px] font-medium uppercase tracking-wider text-white/90"
                      aria-hidden
                    >
                      {label}
                    </span>
                  )}
                  {showOverlay && (
                    <span className="absolute bottom-0 right-0 rounded-[6px] bg-black/55 px-3 py-2.5 text-sm font-medium text-white">
                      Show all photos ({count})
                    </span>
                  )}
                  <PhotoTagMarkers img={img} index={idx} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

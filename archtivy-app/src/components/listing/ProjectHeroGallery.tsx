"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { GalleryImage } from "@/lib/db/gallery";

const HERO_SIZES = "(max-width: 768px) 100vw, 50vw";
const GRID_SIZES = "(max-width: 768px) 50vw, 25vw";

const GAP = 12;
const RADIUS = 4;

function isOptimizedSrc(src: string): boolean {
  return typeof src === "string" && src.includes("supabase.co");
}

export interface ProjectHeroGalleryProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
  /** When set, one of the 4 right tiles shows this image with "Used in this project" overlay and links to #used-in-project-heading */
  usedProductTeaser?: { src: string; alt: string } | null;
}

/**
 * Mobile: 1 main image + horizontal scroll thumbnails. Click thumbnail swaps main.
 * Desktop: left large square + 2x2 grid. 4px radius throughout.
 *
 * Structure: <Image> sits directly in each relative container; click buttons/links are
 * transparent absolute overlays on top. This avoids the stacking-context collapse that
 * occurs when <Image fill> is nested inside an absolutely-positioned <button>/<a>.
 */
export function ProjectHeroGallery({
  images,
  onImageClick,
  usedProductTeaser = null,
}: ProjectHeroGalleryProps) {
  const [mobileSelectedIndex, setMobileSelectedIndex] = React.useState(0);
  const count = images.length;
  if (count === 0) return null;

  const main = images[0];
  const grid = images.slice(1, 5);
  const hasGrid = grid.length > 0;
  const teaser =
    usedProductTeaser?.src && grid.length >= 3 ? usedProductTeaser : null;
  const mainOptimized = isOptimizedSrc(main.src);

  const mobileMain = images[mobileSelectedIndex] ?? main;

  /** Mobile: main image + horizontal thumbnails */
  const MobileGallery = () => (
    <section className="listing-gallery block w-full md:hidden" aria-label="Gallery">
      <div
        className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        style={{ borderRadius: RADIUS }}
      >
        {/* Image directly in relative container */}
        <Image
          src={mobileMain.src}
          alt={mobileMain.alt}
          fill
          className="object-cover"
          style={{ objectPosition: "50% 50%" }}
          sizes="100vw"
          quality={90}
          unoptimized={!isOptimizedSrc(mobileMain.src)}
          priority={mobileSelectedIndex === 0}
        />
        {/* Transparent click overlay */}
        <button
          type="button"
          onClick={() => onImageClick(mobileSelectedIndex)}
          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          aria-label={`View image ${mobileSelectedIndex + 1}: ${mobileMain.alt}`}
        />
        {/* "View all photos" — sits above the click overlay in DOM order */}
        <button
          type="button"
          onClick={() => onImageClick(0)}
          className="absolute bottom-3 right-3 z-10 bg-black/50 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ borderRadius: RADIUS }}
        >
          View all photos
        </button>
      </div>
      <div className="mt-3 overflow-x-auto overflow-y-hidden pb-1">
        <div className="flex gap-2" style={{ minWidth: "min-content" }}>
          {images.map((img, i) => (
            /* Wrapper div is the sized container; button is an overlay */
            <div
              key={img.id}
              className="relative h-16 w-16 shrink-0 overflow-hidden border-2 bg-zinc-100 dark:bg-zinc-800"
              style={{
                borderRadius: RADIUS,
                borderColor: i === mobileSelectedIndex ? "#002abf" : "transparent",
              }}
            >
              <Image
                src={img.src}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
                unoptimized={!isOptimizedSrc(img.src)}
              />
              <button
                type="button"
                onClick={() => setMobileSelectedIndex(i)}
                className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                aria-label={`Show image ${i + 1}`}
                aria-pressed={i === mobileSelectedIndex}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  if (!hasGrid) {
    return (
      <section className="listing-gallery w-full" aria-label="Gallery">
        <div className="md:hidden">
          <MobileGallery />
        </div>
        <div
          className="relative hidden aspect-square w-full max-w-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 md:block"
          style={{ borderRadius: RADIUS }}
        >
          <Image
            src={main.src}
            alt={main.alt}
            fill
            className="object-cover"
            style={{ objectPosition: "50% 50%" }}
            sizes={HERO_SIZES}
            quality={90}
            unoptimized={!mainOptimized}
            priority
            fetchPriority="high"
          />
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            aria-label={`View image 1: ${main.alt}`}
          />
          <span
            className="absolute bottom-3 right-3 z-10 bg-black/50 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm"
            style={{ borderRadius: RADIUS }}
          >
            View all photos
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="listing-gallery w-full" aria-label="Gallery">
      <div className="md:hidden">
        <MobileGallery />
      </div>
      <div
        className="relative hidden grid-cols-1 md:grid md:grid-cols-2 md:items-stretch"
        style={{ gap: GAP }}
      >
        {/* Left: one large square (width-driven, aspect 1:1); defines row height */}
        <div
          className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
          style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
        >
          <Image
            src={main.src}
            alt={main.alt}
            fill
            className="object-cover"
            style={{ objectPosition: "50% 50%" }}
            sizes={HERO_SIZES}
            quality={90}
            unoptimized={!mainOptimized}
            priority
            fetchPriority="high"
          />
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            aria-label={`View image 1: ${main.alt}`}
          />
        </div>

        {/* Right: 2x2 grid; when usedProductTeaser is set, 4th tile is teaser linking to #used-in-project-heading */}
        <div
          className="grid h-full min-h-0 grid-cols-2 grid-rows-2"
          style={{ gap: GAP }}
        >
          {[0, 1, 2, 3].map((i) => {
            const isTeaserCell = i === 3 && teaser;
            if (isTeaserCell && teaser) {
              const teaserOptimized = isOptimizedSrc(teaser.src);
              return (
                <div
                  key="used-in-teaser"
                  className="relative min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                  style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
                >
                  {/* Image behind the link overlay */}
                  <Image
                    src={teaser.src}
                    alt={teaser.alt}
                    fill
                    className="object-cover"
                    style={{ objectPosition: "50% 50%" }}
                    sizes={GRID_SIZES}
                    quality={88}
                    unoptimized={!teaserOptimized}
                  />
                  {/* Link overlay contains only the text label */}
                  <Link
                    href="#used-in-project-heading"
                    className="absolute inset-0 flex items-end focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                    aria-label="Scroll to Used in this project"
                  >
                    <span
                      className="absolute bottom-2 left-2 right-2 rounded px-2 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm"
                      style={{
                        backgroundColor: "rgba(0,0,0,0.35)",
                        borderRadius: RADIUS,
                      }}
                    >
                      Used in this project
                    </span>
                  </Link>
                </div>
              );
            }
            const img = grid[i];
            if (!img) return null;
            const idx = i + 1;
            const stackOptimized = isOptimizedSrc(img.src);
            return (
              <div
                key={img.id}
                className="relative min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  style={{ objectPosition: "50% 50%" }}
                  sizes={GRID_SIZES}
                  quality={88}
                  unoptimized={!stackOptimized}
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

        <div className="absolute bottom-3 right-3 z-10">
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="bg-black/50 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ borderRadius: RADIUS }}
          >
            View all photos
          </button>
        </div>
      </div>
    </section>
  );
}

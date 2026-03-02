"use client";

import * as React from "react";
import Link from "next/link";
import type { GalleryImage } from "@/lib/db/gallery";

const HERO_SIZES = "(max-width: 768px) 100vw, 50vw";
const GRID_SIZES = "(max-width: 768px) 50vw, 25vw";

const GAP = 12;
const RADIUS = 4;

export interface ProjectHeroGalleryProps {
  images: GalleryImage[];
  onImageClick: (index: number) => void;
  usedProductTeaser?: { src: string; alt: string } | null;
}

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

  const mobileMain = images[mobileSelectedIndex] ?? main;

  const MobileGallery = () => (
    <section className="listing-gallery block w-full md:hidden" aria-label="Gallery">
      <div
        className="relative aspect-square w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
        style={{ borderRadius: RADIUS }}
      >
        <img
          src={mobileMain.src}
          alt={mobileMain.alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <button
          type="button"
          onClick={() => onImageClick(mobileSelectedIndex)}
          className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          aria-label={`View image ${mobileSelectedIndex + 1}: ${mobileMain.alt}`}
        />
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
            <div
              key={img.id}
              className="relative h-16 w-16 shrink-0 overflow-hidden border-2 bg-zinc-100 dark:bg-zinc-800"
              style={{
                borderRadius: RADIUS,
                borderColor: i === mobileSelectedIndex ? "#002abf" : "transparent",
              }}
            >
              <img
                src={img.src}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
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
          <img
            src={main.src}
            alt={main.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
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
        {/* Left: large square */}
        <div
          className="relative w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800"
          style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
        >
          <img
            src={main.src}
            alt={main.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <button
            type="button"
            onClick={() => onImageClick(0)}
            className="absolute inset-0 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            aria-label={`View image 1: ${main.alt}`}
          />
        </div>

        {/* Right: 2x2 grid */}
        <div
          className="grid h-full min-h-0 grid-cols-2 grid-rows-2"
          style={{ gap: GAP }}
        >
          {[0, 1, 2, 3].map((i) => {
            const isTeaserCell = i === 3 && teaser;
            if (isTeaserCell && teaser) {
              return (
                <div
                  key="used-in-teaser"
                  className="relative min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                  style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
                >
                  <img
                    src={teaser.src}
                    alt={teaser.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <Link
                    href="#used-in-project-heading"
                    className="absolute inset-0 flex items-end focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
                    aria-label="Scroll to Used in this project"
                  >
                    <span
                      className="absolute bottom-2 left-2 right-2 px-2 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(0,0,0,0.35)", borderRadius: RADIUS }}
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
            return (
              <div
                key={img.id}
                className="relative min-h-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                style={{ borderRadius: RADIUS, aspectRatio: "1 / 1" }}
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

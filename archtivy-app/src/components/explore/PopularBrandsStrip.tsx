"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";

export interface BrandStripItem {
  id: string;
  name: string;
  logoUrl?: string | null;
  href: string;
}

interface PopularBrandsStripProps {
  items: BrandStripItem[];
}

function isValidImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  return url.startsWith("https://") || url.startsWith("http://");
}

export function PopularBrandsStrip({ items }: PopularBrandsStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <section className="border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
            Popular Brands
          </h2>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600 dark:border-zinc-700 dark:hover:border-zinc-600"
              aria-label="Scroll left"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-600 dark:border-zinc-700 dark:hover:border-zinc-600"
              aria-label="Scroll right"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
        >
          {items.map((brand) => (
            <Link
              key={brand.id}
              href={brand.href}
              className="group flex shrink-0 flex-col items-center gap-2"
              style={{ minWidth: 72 }}
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 transition-all group-hover:border-zinc-300 group-hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                {isValidImageUrl(brand.logoUrl) ? (
                  <Image
                    src={brand.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="object-cover grayscale transition-all group-hover:grayscale-0"
                    unoptimized
                  />
                ) : (
                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                    {brand.name[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </div>
              <span className="max-w-[72px] truncate text-center text-[10px] font-medium text-zinc-500 transition-colors group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

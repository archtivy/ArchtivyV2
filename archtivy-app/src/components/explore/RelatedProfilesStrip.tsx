"use client";

import { useRef } from "react";

export interface RelatedProfilesStripItem {
  id: string;
  name: string;
  logoUrl?: string | null;
  locationText?: string | null;
  href: string;
}

interface RelatedProfilesStripProps {
  title: string;
  variant: "with-location" | "no-location";
  items: RelatedProfilesStripItem[];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "right" ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RelatedProfilesStrip({
  title,
  variant,
  items,
}: RelatedProfilesStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? el.clientWidth * 0.8 : -(el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <div className="rounded-[4px] bg-zinc-900 px-5 py-5 dark:bg-zinc-800 sm:px-6 sm:py-6">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {title}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-white/20 hover:bg-white/8 hover:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Scroll left"
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition hover:border-white/20 hover:bg-white/8 hover:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-white/20"
            aria-label="Scroll right"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-auto sm:gap-7 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group flex w-[68px] shrink-0 flex-col items-center gap-2 text-center focus:outline-none sm:w-[76px]"
          >
            {/* Circle avatar */}
            <div className="relative h-[60px] w-[60px] overflow-hidden rounded-full border border-white/10 bg-zinc-700 sm:h-[68px] sm:w-[68px]">
              {item.logoUrl ? (
                <img
                  src={item.logoUrl}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-zinc-400 sm:text-sm">
                  {getInitials(item.name)}
                </span>
              )}
            </div>

            {/* Name */}
            <span className="block w-full truncate text-[12px] font-medium leading-snug text-zinc-300 transition group-hover:text-white sm:text-[13px]">
              {item.name}
            </span>

            {/* Location — projects only */}
            {variant === "with-location" && item.locationText && (
              <span className="block w-full truncate text-[10px] leading-tight text-zinc-600 sm:text-[11px]">
                {item.locationText}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

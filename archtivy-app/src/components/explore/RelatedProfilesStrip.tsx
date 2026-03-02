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
    <div className="rounded-[4px] border border-slate-200 bg-white px-5 py-5 sm:px-6 sm:py-5">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#002abf" }}
        >
          {title}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
            aria-label="Scroll left"
          >
            <ChevronIcon dir="left" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
            aria-label="Scroll right"
          >
            <ChevronIcon dir="right" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto sm:gap-6 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group flex w-[110px] shrink-0 flex-col items-center gap-2 text-center focus:outline-none sm:w-[130px]"
          >
            {/* Circle avatar */}
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-100 sm:h-[72px] sm:w-[72px]">
              {item.logoUrl ? (
                <img
                  src={item.logoUrl}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[13px] font-semibold text-slate-500 sm:text-sm">
                  {getInitials(item.name)}
                </span>
              )}
            </div>

            {/* Name */}
            <span className="block w-full truncate text-[12px] font-medium leading-snug text-zinc-700 transition group-hover:text-zinc-900 sm:text-[13px]">
              {item.name}
            </span>

            {/* Location — projects only */}
            {variant === "with-location" && item.locationText && (
              <span className="block w-full truncate text-[10px] leading-tight text-zinc-400 sm:text-[11px]">
                {item.locationText}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

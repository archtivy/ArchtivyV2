"use client";

import { useRouter } from "next/navigation";
import type { ExplorePanelType } from "@/lib/explore/exploreParams";

export interface ExploreMastheadProps {
  city?: string | null;
}

export function ExploreIntelligenceHero({ city }: ExploreMastheadProps) {
  const router = useRouter();

  const dismissCity = () => {
    router.push("/explore");
  };

  const cityLabel = city
    ? city.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <section className="py-16 sm:py-24" aria-label="Explore masthead">
      <div className="mx-auto max-w-[1040px] px-4 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Architecture Intelligence
        </p>
        <h1 className="mt-3 font-serif text-4xl font-light tracking-tight text-zinc-900 sm:text-5xl">
          Global network of projects,
          <br className="hidden sm:block" /> designers and brands.
        </h1>
        <p className="mt-4 text-base text-zinc-500 sm:text-lg">
          Live signals from the architecture network — ranked by collaboration, integration and influence.
        </p>

        {cityLabel && (
          <div className="mt-6 inline-flex items-center gap-2 rounded border border-[#002abf]/20 bg-[#002abf]/5 px-3 py-1.5">
            <span className="text-sm font-medium text-[#002abf]">
              Filtered to {cityLabel}
            </span>
            <button
              type="button"
              onClick={dismissCity}
              aria-label="Remove city filter"
              className="flex h-4 w-4 items-center justify-center rounded-full text-[#002abf]/60 hover:text-[#002abf]"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

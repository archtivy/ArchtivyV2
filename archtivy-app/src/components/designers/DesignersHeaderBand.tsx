"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { HeroStatPanel } from "@/components/home/HeroStatPanel";
import type { PlatformTotals } from "@/lib/db/platformTotals";
import type { HeroFeature } from "@/lib/db/heroFeature";

/**
 * Designers header band (brief §1). Same construction as ProjectsHeaderBand —
 * copy left, real photograph right, HeroStatPanel over the image where its
 * cream-on-dark contrast holds.
 *
 * SEARCH: this filters the grid in place rather than reusing HeroSearch.
 * HeroSearch submits to /explore/projects?q=, which would take someone who
 * typed a studio name away from the designer list and run it against projects
 * instead — a dead end. There is no designer-scoped search endpoint to submit
 * to, and with 24 records the whole set is already on the client, so filtering
 * as you type is both instant and real. The chrome matches HeroSearch.
 */
export function DesignersHeaderBand({
  total,
  totals,
  feature,
  query,
  onQueryChange,
}: {
  total: number;
  totals: PlatformTotals;
  feature: HeroFeature | null;
  query: string;
  onQueryChange: (v: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl bg-stone/60">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="min-w-0 px-6 py-10 sm:px-10 sm:py-12 lg:col-span-7">
          <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">Designers</p>

          <h1 className="mt-3 max-w-[16ch] font-display text-[40px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[56px]">
            Discover the world&rsquo;s leading designers.
          </h1>

          <p className="mt-4 max-w-[46ch] font-body text-[16px] leading-[26px] text-muted">
            Explore {total} {total === 1 ? "architect, interior designer" : "architects, interior designers"} and
            studios shaping the built environment.
          </p>

          <div className="mt-7 w-full max-w-[560px]">
            <label htmlFor="designers-search" className="sr-only">
              Search designers, studios, locations
            </label>
            <span className="relative block">
              <Search
                strokeWidth={1.5}
                className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                id="designers-search"
                type="search"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Search designers, studios, locations..."
                className="h-[56px] w-full rounded-full border border-transparent bg-cream pl-14 pr-6 font-body text-[15px] text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
              />
            </span>
          </div>
        </div>

        <div className="relative min-h-[220px] lg:col-span-5">
          {feature && (
            <Image
              src={feature.imageUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-l from-ink/80 via-ink/50 to-transparent"
            aria-hidden
          />
          <div className="relative flex h-full items-center justify-end p-6 sm:p-8">
            <HeroStatPanel totals={totals} />
          </div>
          {feature && (
            <p className="absolute bottom-2 left-4 font-body text-[11px] text-cream/50">
              Pictured:{" "}
              <Link href={feature.href} className="underline decoration-cream/30 underline-offset-2">
                {feature.title}
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

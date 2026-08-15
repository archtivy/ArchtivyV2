import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroStatPanel } from "@/components/home/HeroStatPanel";
import { getPlatformTotals } from "@/lib/db/platformTotals";
import { getHeroFeature } from "@/lib/db/heroFeature";
import type { ProductFacets } from "@/lib/db/productsDirectory";

/**
 * Header band (brief §1).
 *
 * Reuses HeroSearch, HeroStatPanel and getPlatformTotals() — the same
 * components and helper as the homepage and Projects Index, per the brief's
 * instruction not to reimplement them.
 *
 * Popular searches come from the real category and material vocabularies, so
 * every chip runs a query that returns results.
 */
export async function ProductsHeaderBand({
  total,
  facets,
}: {
  total: number;
  facets: ProductFacets;
}) {
  const [totals, feature] = await Promise.all([getPlatformTotals(), getHeroFeature()]);

  const popular = [
    ...facets.categories.slice(0, 3).map((c) => ({
      label: c.label,
      href: `/explore/products?q=${encodeURIComponent(c.label)}`,
    })),
    ...facets.materials.slice(0, 2).map((m) => ({
      label: m.label,
      href: `/explore/products?q=${encodeURIComponent(m.label)}`,
    })),
    ...facets.brands.slice(0, 1).map((b) => ({
      label: b.label,
      href: `/explore/products?q=${encodeURIComponent(b.label)}`,
    })),
  ];

  return (
    <section className="overflow-hidden rounded-xl bg-stone/60">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="min-w-0 px-6 py-10 sm:px-10 sm:py-12 lg:col-span-7">
          <h1 className="font-display text-[36px] leading-[1.06] tracking-[-0.02em] text-ink sm:text-[52px]">
            Products for Architecture
          </h1>
          <p className="mt-4 max-w-[44ch] font-body text-[16px] leading-[26px] text-muted">
            Browse {total} products documented on Archtivy, credited to the projects
            that specify them.
          </p>

          <div className="mt-7 [&_a]:border-ink/20 [&_a]:text-ink [&_a:hover]:bg-ink/5 [&_span]:text-muted">
            <HeroSearch popularSearches={popular} />
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
              <Link
                href={feature.href}
                className="underline decoration-cream/30 underline-offset-2"
              >
                {feature.title}
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

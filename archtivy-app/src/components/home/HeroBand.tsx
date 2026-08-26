import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroCategoryPills } from "@/components/home/HeroCategoryPills";
import { HeroConnectionMetric } from "@/components/home/HeroConnectionMetric";
import { getHeroFeature } from "@/lib/db/heroFeature";
import { getConnectionsMapped } from "@/lib/db/connectionsMetric";
import { getHomeCategories, toPopularSearches } from "@/lib/db/homeCategories";

/**
 * Hero band — dark, full-bleed, ~640px tall on desktop.
 *
 * This is the one place a dark surface is permitted (Blueprint §6): it is a
 * large-format photographic backdrop, not a persistent UI mode.
 *
 * The photograph is a real approved project, credited and linked beneath the
 * search — an architecture platform should not use someone's building as
 * anonymous wallpaper (Blueprint §19: attribution is a first-class UI element).
 *
 * ── SINGLE COLUMN ───────────────────────────────────────────────────────────
 * The statistics rail that used to occupy the right third (Projects, Designers,
 * Brands, Products, Countries, via HeroStatPanel) is deliberately gone. The
 * hero now reads top to bottom as one column: headline, subtitle, search,
 * category pills, connections count.
 *
 * HeroStatPanel and getPlatformTotals are left in place untouched — this
 * component simply stopped calling them. They are not deleted here because
 * nothing else in this change makes them dead on purpose, and removing them
 * would be a separate decision from redesigning a layout.
 *
 * ── ONE NUMBER, NOT SIX ─────────────────────────────────────────────────────
 * "N connections mapped" is now the only figure the hero carries, and it is the
 * one that describes what the platform is for. Its formula is unchanged from
 * where it shipped — see lib/db/connectionsMetric.ts.
 *
 * All three data sources are cached with domain tags, so the homepage keeps its
 * ISR behaviour and costs no DB round trips on a cache hit.
 */
export async function HeroBand() {
  const [feature, categories, connections] = await Promise.all([
    getHeroFeature(),
    getHomeCategories(),
    getConnectionsMapped(),
  ]);

  const popular = toPopularSearches(categories, 6);

  return (
    <section
      className="relative isolate min-h-[560px] overflow-hidden bg-ink lg:min-h-[640px]"
      aria-labelledby="home-hero-heading"
    >
      {feature && (
        <div className="absolute inset-0 -z-10" aria-hidden>
          <Image
            src={feature.imageUrl}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      {/* Legibility scrim, weighted left. The left column sits over ~95%
          opacity so body copy clears WCAG AA against a bright daytime
          photograph; the right third stays lighter so the building still reads
          as an image rather than a dark texture.

          Opacity steps MUST be multiples of 5. Tailwind's scale has no /92, and
          an out-of-scale value is dropped silently — the class compiles away,
          the gradient loses its from- stop, and the scrim disappears entirely
          with no error anywhere. That is exactly what happened here first pass:
          white text on a bright sky, only visible in a screenshot. */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/95 via-ink/75 to-ink/40"
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/70 via-transparent to-ink/30"
        aria-hidden
      />

      <div className="mx-auto flex min-h-[560px] max-w-content flex-col justify-center px-4 pb-24 pt-[112px] md:px-12 lg:min-h-[640px] lg:px-24 lg:pb-28">
        {/* Capped rather than full-bleed. Without a max width the search bar and
            pills would run the full 1440px into the right of the photograph —
            the part the scrim deliberately leaves light so the building still
            reads as a building. */}
        <div className="min-w-0 max-w-[720px]">
          <h1
            id="home-hero-heading"
            className="max-w-[13ch] font-display text-[40px] font-normal leading-[1.06] tracking-[-0.02em] text-cream sm:text-[56px] lg:text-[72px] lg:leading-[80px]"
          >
            Architecture, connected.
          </h1>

          <p className="mt-5 max-w-[46ch] font-body text-[16px] leading-[28px] text-cream/70">
            Discover projects, products, designers and brands through the
            relationships between them.
          </p>

          <div className="mt-8">
            <HeroSearch popularSearches={popular} />
          </div>

          <HeroCategoryPills categories={categories} />

          <HeroConnectionMetric connections={connections} />

          {feature && (
            <p className="mt-8 font-body text-[12px] leading-[16px] text-cream/45">
              Pictured:{" "}
              <Link
                href={feature.href}
                className="text-cream/70 underline decoration-cream/25 underline-offset-4 transition-colors hover:text-cream"
              >
                {feature.title}
              </Link>
              {feature.location && <> — {feature.location}</>}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

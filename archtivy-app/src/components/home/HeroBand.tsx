import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroStatPanel } from "@/components/home/HeroStatPanel";
import { getHeroFeature } from "@/lib/db/heroFeature";
import { getPlatformTotals } from "@/lib/db/platformTotals";
import { getHomeCategories, toPopularSearches } from "@/lib/db/homeCategories";

/**
 * Hero band (Build Brief §2) — dark, full-bleed, ~640px tall on desktop.
 *
 * This is the one place a dark surface is permitted (Blueprint §6): it is a
 * large-format photographic backdrop, not a persistent UI mode.
 *
 * The photograph is a real approved project, credited and linked beneath the
 * search — an architecture platform should not use someone's building as
 * anonymous wallpaper (Blueprint §19: attribution is a first-class UI element).
 *
 * All three data sources are cached with domain tags, so the homepage keeps its
 * ISR behaviour and costs no DB round trips on a cache hit.
 */
export async function HeroBand() {
  const [feature, totals, categories] = await Promise.all([
    getHeroFeature(),
    getPlatformTotals(),
    getHomeCategories(),
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

      {/* Legibility scrim, weighted left per the brief. The left column sits
          over ~95% opacity so body copy clears WCAG AA against a bright
          daytime photograph; the right third stays lighter so the building
          still reads as an image rather than a dark texture.

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
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-8">
            <h1
              id="home-hero-heading"
              className="max-w-[13ch] font-display text-[40px] font-normal leading-[1.06] tracking-[-0.02em] text-cream sm:text-[56px] lg:text-[72px] lg:leading-[80px]"
            >
              The world&rsquo;s architecture knowledge graph.
            </h1>

            <p className="mt-5 max-w-[46ch] font-body text-[16px] leading-[28px] text-cream/70">
              Discover projects, designers and products. All connected.
            </p>

            <div className="mt-8">
              <HeroSearch popularSearches={popular} />
            </div>

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

          {/* Stat panel. On tablet and below it moves beneath the search rather
              than disappearing (Blueprint §9 — adapt, never remove). */}
          <div className="min-w-0 lg:col-span-4 lg:flex lg:items-center lg:justify-end">
            <HeroStatPanel totals={totals} />
          </div>
        </div>
      </div>
    </section>
  );
}

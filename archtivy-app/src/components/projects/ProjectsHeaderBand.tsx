import Image from "next/image";
import Link from "next/link";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroStatPanel } from "@/components/home/HeroStatPanel";
import { getPlatformTotals } from "@/lib/db/platformTotals";
import { getHeroFeature } from "@/lib/db/heroFeature";
import type { DirectoryFacets } from "@/lib/db/projectsDirectory";

/**
 * Header band (Projects Index brief §1).
 *
 * Reuses HeroSearch and HeroStatPanel from the homepage rather than
 * reimplementing either — same search destination, same real totals from
 * getPlatformTotals().
 *
 * On cream, not over a photo: the photograph sits to the right of the copy, so
 * the stat panel needs dark-on-light treatment. HeroStatPanel is built for
 * cream-on-dark, so it is placed over the image where its contrast holds,
 * matching the reference.
 */
export async function ProjectsHeaderBand({
  total,
  facets,
}: {
  total: number;
  facets: DirectoryFacets;
}) {
  const [totals, feature] = await Promise.all([getPlatformTotals(), getHeroFeature()]);

  // Popular searches drawn from the real facet vocabulary, so every chip runs a
  // query guaranteed to return results. No invented terms.
  const popular = [
    ...facets.buildingTypes.slice(0, 3).map((b) => ({
      label: b.label,
      href: `/explore/projects?q=${encodeURIComponent(b.label)}`,
    })),
    ...facets.materials.slice(0, 2).map((m) => ({
      label: m.label,
      href: `/explore/projects?q=${encodeURIComponent(m.label)}`,
    })),
    ...facets.locations.slice(0, 1).map((l) => ({
      label: l.label,
      href: `/explore/projects?q=${encodeURIComponent(l.label)}`,
    })),
  ];

  return (
    <section className="overflow-hidden rounded-xl bg-stone/60">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="min-w-0 px-6 py-10 sm:px-10 sm:py-12 lg:col-span-7">
          <h1 className="font-display text-[40px] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[56px]">
            Projects
          </h1>
          <p className="mt-4 max-w-[42ch] font-body text-[16px] leading-[26px] text-muted">
            Explore {total} architecture and design {total === 1 ? "project" : "projects"} from
            studios around the world.
          </p>

          {/* HeroSearch renders cream-on-dark chips; on this light band the
              popular-search row is rendered separately below instead. */}
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
          <div className="absolute inset-0 bg-gradient-to-l from-ink/80 via-ink/50 to-transparent" aria-hidden />
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

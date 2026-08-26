import Image from "next/image";
import Link from "next/link";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import type { PopularProfile } from "@/lib/db/popularProfiles";

/**
 * Popular brands and designers — replaces the mockup's "Deeper Content" band.
 *
 * That band was editorial (interviews, features, a magazine). There is no CMS
 * behind any of it, so rendering it would have meant four hardcoded cards
 * linking nowhere. These are two rails of real profiles instead, ranked from
 * data that already exists — see lib/db/popularProfiles.ts.
 *
 * ── LOGOS GET CONTAIN, PEOPLE GET COVER ─────────────────────────────────────
 * A brand logo is usually a wordmark on a transparent or white field; cropping
 * it to fill a square cuts the wordmark in half. Brands render object-contain on
 * a stone tile with padding. Designer avatars are photographs and use
 * object-cover in a circle. Every profile in both rails is guaranteed to have an
 * avatar — the query requires one, precisely so neither rail shows a gap.
 *
 * Each rail renders only if it has entries, and the section disappears entirely
 * if neither does.
 */

function BrandTile({ brand }: { brand: PopularProfile }) {
  return (
    <Link
      href={`/u/${brand.username}`}
      className="group flex flex-col items-center gap-3 text-center"
    >
      <div className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-hairline bg-cream transition-colors group-hover:border-ink/25">
        <Image
          src={brand.avatarUrl}
          alt=""
          fill
          sizes="160px"
          className="object-contain p-4"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-body text-[13px] font-medium text-ink group-hover:underline">
          {brand.displayName}
        </p>
        <p className="font-body text-[12px] text-muted">
          {brand.primaryCount > 0
            ? `In ${brand.primaryCount} ${brand.primaryCount === 1 ? "project" : "projects"}`
            : `${brand.secondaryCount} ${brand.secondaryCount === 1 ? "product" : "products"}`}
        </p>
      </div>
    </Link>
  );
}

function DesignerTile({ designer }: { designer: PopularProfile }) {
  return (
    <Link href={`/u/${designer.username}`} className="group flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-stone">
        <Image src={designer.avatarUrl} alt="" fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-body text-[13px] font-medium text-ink group-hover:underline">
          {designer.displayName}
        </p>
        <p className="truncate font-body text-[12px] text-muted">
          {designer.primaryCount} {designer.primaryCount === 1 ? "project" : "projects"}
          {designer.location ? ` — ${designer.location}` : ""}
        </p>
      </div>
    </Link>
  );
}

export function PopularProfilesSection({
  brands,
  designers,
}: {
  brands: PopularProfile[];
  designers: PopularProfile[];
}) {
  if (brands.length === 0 && designers.length === 0) return null;

  return (
    <section className="border-t border-hairline py-14" aria-labelledby="popular-heading">
      {brands.length > 0 && (
        <>
          <HomeSectionHeader
            title="Brands on Archtivy"
            href="/brands"
            linkLabel="View all brands"
          />
          <div className="mb-14 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 12).map((b) => (
              <BrandTile key={b.id} brand={b} />
            ))}
          </div>
        </>
      )}

      {designers.length > 0 && (
        <>
          <HomeSectionHeader
            title="Designers on Archtivy"
            href="/designers"
            linkLabel="View all designers"
          />
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {designers.slice(0, 9).map((d) => (
              <DesignerTile key={d.id} designer={d} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

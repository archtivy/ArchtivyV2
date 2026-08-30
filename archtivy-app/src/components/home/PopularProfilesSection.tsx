import Image from "next/image";
import Link from "next/link";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { HorizontalRail } from "@/components/entity/HorizontalRail";
import type { PopularProfile } from "@/lib/db/popularProfiles";

/**
 * Brands on Archtivy / Designers on Archtivy — two rails, one per entity type.
 *
 * ── WHAT CHANGED ────────────────────────────────────────────────────────────
 * These were two WRAPPING GRIDS: brands six-across in rows that left a ragged
 * half-row at twelve items, and designers as a three-column list of small
 * avatar+text rows that looked nothing like the brand wall above it. They are
 * now two horizontal rails with the same rhythm, matching the reference.
 *
 * Both use the shared HorizontalRail rather than another hand-rolled
 * `overflow-x-auto`, so they inherit its keyboard order, its arrows-only-on-
 * overflow rule and its scroll snapping for free. The three options it grew for
 * this section (gap, arrow placement, page dots) all default to its previous
 * behaviour, so ProjectTeam is untouched.
 *
 * ── TWO TREATMENTS, ON PURPOSE ──────────────────────────────────────────────
 * Brands are an open logo strip divided by hairlines: a wordmark boxed in its
 * own bordered card competes with the mark itself, which is why the reference
 * draws no card around them. Designers are restrained bordered cards, because
 * a studio entry carries three lines of text and needs an edge to group them.
 *
 * ── LOGOS GET CONTAIN, PEOPLE GET COVER ─────────────────────────────────────
 * A brand logo is usually a wordmark on a transparent or white field; cropping
 * it to fill a square cuts the wordmark in half. Designer avatars are marks or
 * photographs in a circle and use object-cover.
 *
 * ── NO FALLBACK TILE, BECAUSE THERE IS NOTHING TO FALL BACK FROM ────────────
 * getPopularProfiles requires a non-empty avatar_url (and re-checks it in JS,
 * since `.not(is null)` does not exclude ""), so every profile that reaches
 * this component has a real logo. An initials fallback here would be a branch
 * that cannot execute. If that filter is ever relaxed, the fallback belongs
 * here and `initialsOf` from EntityCard is the canonical one to use.
 *
 * ── THE COUNTS ARE THE ONES THE REFERENCE ASKS FOR, AND THEY ARE REAL ───────
 * Brands show catalogue size — "12 products" — from secondaryCount. The
 * previous tile preferred "In N projects" and fell back to products, so the
 * same rail mixed two different units depending on the brand.
 * Designers show published work — "8 projects" — from primaryCount, which is
 * projects OWNED. Both come from getPopularProfiles' existing four-query
 * batch; nothing per-item is fetched here.
 */

/** ~6 across at the 1248px homepage content width, and a floor below that. */
const BRAND_W = "w-[208px]";
const DESIGNER_W = "w-[194px]";

function BrandItem({ brand }: { brand: PopularProfile }) {
  return (
    /* The divider is a LEFT border with symmetric padding and gap-0 on the
       track, so the hairline sits centred between two logos. With the rail's
       default gap it would have floated against the following item instead. */
    <li className={`${BRAND_W} shrink-0 snap-start border-l border-hairline first:border-l-0`}>
      <Link
        href={`/u/${brand.username}`}
        className="group flex h-full flex-col items-center px-6 py-2 text-center"
      >
        <span className="relative flex h-[92px] w-full items-center justify-center">
          <Image
            src={brand.avatarUrl}
            alt=""
            fill
            sizes="208px"
            className="object-contain transition-opacity group-hover:opacity-80"
          />
        </span>
        <span className="mt-5 min-w-0 max-w-full">
          <span className="block truncate font-body text-[14px] font-medium text-ink group-hover:underline">
            {brand.displayName}
          </span>
          <span className="mt-1 block font-body text-[13px] text-muted">
            {brand.secondaryCount} {brand.secondaryCount === 1 ? "product" : "products"}
          </span>
        </span>
      </Link>
    </li>
  );
}

function DesignerItem({ designer }: { designer: PopularProfile }) {
  return (
    <li className={`${DESIGNER_W} shrink-0 snap-start`}>
      <Link
        href={`/u/${designer.username}`}
        className="group flex h-full flex-col rounded-xl border border-hairline bg-cream p-5 transition-colors hover:border-ink/25"
      >
        <span className="relative mx-auto h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full bg-stone">
          <Image src={designer.avatarUrl} alt="" fill sizes="68px" className="object-cover" />
        </span>
        <span className="mt-5 block font-body text-[14px] font-medium leading-[20px] text-ink group-hover:underline">
          {designer.displayName}
        </span>
        <span className="mt-2.5 block font-body text-[13px] leading-[20px] text-muted">
          {designer.primaryCount} {designer.primaryCount === 1 ? "project" : "projects"}
        </span>
        {/* Location is dropped entirely when absent — never an em dash or a
            blank line holding space for a value the profile does not have. */}
        {designer.location && (
          <span className="block font-body text-[13px] leading-[20px] text-muted">
            {designer.location}
          </span>
        )}
      </Link>
    </li>
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
    <>
      {brands.length > 0 && (
        <section className="border-t border-hairline py-14" aria-label="Brands on Archtivy">
          <HomeSectionHeader
            title="Brands on Archtivy"
            subtitle="Explore brands behind iconic products and materials."
            href="/brands"
            linkLabel="View all brands"
          />
          <HorizontalRail
            ariaLabel="Brands on Archtivy"
            gapClassName="gap-0"
            arrowPlacement="outside"
            pageDots
            className="mt-8"
          >
            {brands.map((b) => (
              <BrandItem key={b.id} brand={b} />
            ))}
          </HorizontalRail>
        </section>
      )}

      {designers.length > 0 && (
        <section className="border-t border-hairline py-14" aria-label="Designers on Archtivy">
          <HomeSectionHeader
            title="Designers on Archtivy"
            subtitle="Discover the studios and architects creating inspiring spaces."
            href="/designers"
            linkLabel="View all designers"
          />
          <HorizontalRail
            ariaLabel="Designers on Archtivy"
            arrowPlacement="outside"
            pageDots
            className="mt-8"
          >
            {designers.map((d) => (
              <DesignerItem key={d.id} designer={d} />
            ))}
          </HorizontalRail>
        </section>
      )}
    </>
  );
}

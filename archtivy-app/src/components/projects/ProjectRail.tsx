import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ListingCardShared, type ListingCardModel } from "@/components/listing/ListingCardShared";

/**
 * A full-width row of project cards, for the discovery sections below the
 * project detail fold: "More from {studio}", "More projects in {place}" and
 * the category-based related row.
 *
 * The project-side twin of components/products/ProductRail, and shared for the
 * same reason: three near-identical rows on one page is how the card families
 * drifted apart before. `items` are complete ListingCardModels resolved by
 * getProjectRailCards — taxonomy line, location, year, studio avatar,
 * relationship badge, save behaviour — so nothing about the canonical card is
 * overridden or re-specified here.
 *
 * Renders nothing when empty, so no section ever shows an empty heading.
 */
export function ProjectRail({
  title,
  href,
  linkLabel,
  items,
}: {
  title: string;
  /** Optional "view all" destination. Omitted rather than faked. */
  href?: string | null;
  linkLabel?: string;
  items: ListingCardModel[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16" aria-label={title}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-display text-[24px] tracking-tight text-ink">{title}</h2>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 font-body text-[13px] text-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {linkLabel}
            <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>

      {/* Same grid conventions as the product rails: two up on a phone,
          stepping to four in this eight-column main content area. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 4).map((m) => (
          <ListingCardShared key={m.id} model={m} sizes="(max-width: 640px) 45vw, 22vw" />
        ))}
      </div>
    </section>
  );
}

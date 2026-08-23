import Link from "next/link";
import type { ExploreType } from "@/lib/explore/filters/schema";

export interface ExploreEmptyStateProps {
  type: ExploreType;
  /** When set, show city-specific message and single "Add Listing" button. */
  cityName: string | null;
  /** When true, show "Reset Filters" + "Add the First Listing"; when false and cityName set, show only "Add Listing". */
  showResetAndFirst: boolean;
}

export function ExploreEmptyState({ type, cityName, showResetAndFirst }: ExploreEmptyStateProps) {
  const addHref = type === "projects" ? "/add/project" : "/add/product";
  const path = type === "projects" ? "/explore/projects" : "/explore/products";

  const isCityOnly = Boolean(cityName?.trim());
  const title = isCityOnly
    ? `No listings yet in ${cityName!.trim()}.`
    : "No results found in this area.";
  const subtext = isCityOnly
    ? "Be the first to add a project or product here."
    : "Try adjusting your filters or expand the map to discover more.";

  return (
    <div className="rounded-lg border border-hairline bg-stone/40 px-6 py-10 text-center sm:px-10 sm:py-12">
      <p className="text-base font-medium text-ink sm:text-lg">
        {title}
      </p>
      <p className="mt-2 text-sm text-muted">
        {subtext}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {showResetAndFirst && !isCityOnly && (
          <Link
            href={path}
            className="inline-block rounded-[20px] border border-hairline bg-transparent px-4 py-2 text-sm font-medium text-ink hover:border-ink hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          >
            Reset Filters
          </Link>
        )}
        <Link
          href={addHref}
          className="inline-block rounded-[20px] bg-ink px-4 py-2 text-sm font-medium text-cream transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
        >
          {isCityOnly ? "Add Listing" : "Add the First Listing"}
        </Link>
      </div>
    </div>
  );
}

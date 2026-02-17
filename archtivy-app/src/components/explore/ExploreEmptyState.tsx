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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900 sm:px-10 sm:py-12">
      <p className="text-base font-medium text-zinc-900 sm:text-lg dark:text-zinc-100">
        {title}
      </p>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {subtext}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {showResetAndFirst && !isCityOnly && (
          <Link
            href={path}
            className="inline-block rounded-[20px] border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-900 hover:border-[#002abf] hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-100 dark:hover:border-[#5b7cff] dark:hover:text-[#5b7cff] dark:focus:ring-offset-zinc-950"
          >
            Reset Filters
          </Link>
        )}
        <Link
          href={addHref}
          className="inline-block rounded-[20px] bg-[#002abf] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
        >
          {isCityOnly ? "Add Listing" : "Add the First Listing"}
        </Link>
      </div>
    </div>
  );
}

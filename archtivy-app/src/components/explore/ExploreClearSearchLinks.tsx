import Link from "next/link";
import { filtersToQueryString } from "@/lib/explore/filters/query";
import type { ExploreFilters, ExploreType } from "@/lib/explore/filters/schema";

export interface ExploreClearSearchLinksProps {
  type: ExploreType;
  currentFilters: ExploreFilters;
}

export function ExploreClearSearchLinks({ type, currentFilters }: ExploreClearSearchLinksProps) {
  const path = type === "projects" ? "/explore/projects" : "/explore/products";
  const withoutQ = { ...currentFilters, q: null };
  const qsWithoutQ = filtersToQueryString(withoutQ, type);
  const hrefClearSearch = qsWithoutQ.toString() ? `${path}?${qsWithoutQ.toString()}` : path;

  return (
    <>
      {currentFilters.q?.trim() && (
        <Link
          href={hrefClearSearch}
          className="text-sm font-medium text-[#002abf] hover:underline dark:text-[#5b7cff]"
        >
          Clear search
        </Link>
      )}
      <Link
        href={path}
        className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400"
      >
        Clear all filters
      </Link>
    </>
  );
}

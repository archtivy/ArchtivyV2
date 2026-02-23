export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProjectsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProjectFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreCountsHero } from "@/components/explore/ExploreCountsHero";
import { ExploreProjectsContent } from "@/components/explore/ExploreProjectsContent";
import { ExploreSearchBar } from "@/components/search/ExploreSearchBar";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";

export default async function ExploreProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseExploreFilters(params, "projects");
  const projectFilters = exploreFiltersToProjectFilters(filters);

  const [result, options, networkCounts] = await Promise.all([
    getProjectsCanonicalFiltered({
      filters: projectFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc" | "area_desc",
    }),
    getExploreFilterOptions("projects"),
    getExploreNetworkCounts(),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  const cityDisplay = filters.city?.trim()
    ? filters.city.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <ExploreCountsHero counts={networkCounts} />
      <div className="space-y-4 pt-4">
        <ExploreSearchBar type="projects" currentFilters={filters} />

          {filters.q?.trim() && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Search results for: <span className="font-medium">&quot;{filters.q.trim()}&quot;</span>
            </p>
          )}

          <ExploreFilterBar
            type="projects"
            currentFilters={filters}
            options={options}
            sort={filters.sort}
          />

          {isEmpty ? (
            <ExploreEmptyState
              type="projects"
              cityName={cityDisplay}
              showResetAndFirst={!cityDisplay}
            />
          ) : (
            <ExploreProjectsContent
              key={filterSortKey}
              initialData={initialData}
              initialTotal={total}
              filters={projectFilters}
              sort={filters.sort as "newest" | "year_desc" | "area_desc"}
            />
          )}
      </div>
    </div>
  );
}

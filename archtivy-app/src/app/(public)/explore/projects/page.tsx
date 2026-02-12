import { getProjectsCanonicalFiltered, getExploreStats } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProjectFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { ExploreFilterBar } from "@/components/explore/ExploreFilterBar";
import { ExploreStatsStrip } from "@/components/explore/ExploreStatsStrip";
import { ExploreProjectsContent } from "@/components/explore/ExploreProjectsContent";
import { ExploreSearchBar } from "@/components/search/ExploreSearchBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ExploreClearSearchLinks } from "@/components/explore/ExploreClearSearchLinks";

export default async function ExploreProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseExploreFilters(params, "projects");
  const projectFilters = exploreFiltersToProjectFilters(filters);

  const [result, options, stats] = await Promise.all([
    getProjectsCanonicalFiltered({
      filters: projectFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc" | "area_desc",
    }),
    getExploreFilterOptions("projects"),
    getExploreStats("projects"),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Explore projects
          </h1>
          {stats != null && (
            <ExploreStatsStrip
              type="projects"
              totalListings={stats.totalListings}
              totalConnections={stats.totalConnections}
            />
          )}
        </div>
        <Button as="link" href="/add/project" variant="primary">
          Add project
        </Button>
      </div>

      <ExploreSearchBar type="projects" currentFilters={filters} className="mb-2" />

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
        <EmptyState
          title="No projects match"
          description="Try changing filters or add a new project."
          action={
            <div className="flex flex-wrap items-center gap-3">
              <ExploreClearSearchLinks type="projects" currentFilters={filters} />
              <Button as="link" href="/add/project" variant="primary">
                Add project
              </Button>
            </div>
          }
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
  );
}

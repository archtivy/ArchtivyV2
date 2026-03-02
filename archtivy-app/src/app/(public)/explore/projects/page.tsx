import { getProjectsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProjectFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { getPlatformStats } from "@/lib/db/platformActivity";
import { getProfilesForStrip } from "@/lib/db/profiles";
import { ExploreEditorialHeader } from "@/components/explore/ExploreEditorialHeader";
import { ExploreProjectsContent } from "@/components/explore/ExploreProjectsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { Container } from "@/components/layout/Container";

export default async function ExploreProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseExploreFilters(params, "projects");
  const projectFilters = exploreFiltersToProjectFilters(filters);

  const [result, options, networkCounts, platformStats, designerProfiles] = await Promise.all([
    getProjectsCanonicalFiltered({
      filters: projectFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc" | "area_desc",
    }),
    getExploreFilterOptions("projects"),
    getExploreNetworkCounts(),
    getPlatformStats(),
    getProfilesForStrip(["designer", "brand"], 18),
  ]);

  const { data: initialData, total } = result;
  const isEmpty = initialData.length === 0;
  const filterSortKey = JSON.stringify({ filters, sort: filters.sort });

  const cityDisplay = filters.city?.trim()
    ? filters.city.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  const designerStripItems = designerProfiles.map((d) => ({
    id: d.id,
    name: d.display_name ?? d.username ?? "Designer",
    logoUrl: d.avatar_url,
    locationText: d.location_city ?? d.location_country ?? null,
    href: `/u/${d.username ?? `id/${d.id}`}`,
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <ExploreEditorialHeader
        type="projects"
        counts={networkCounts}
        options={options}
        currentFilters={filters}
        platformStats={platformStats}
      />

      <Container className="py-6">
        {filters.q?.trim() && (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Search results for:{" "}
            <span className="font-medium">&quot;{filters.q.trim()}&quot;</span>
          </p>
        )}

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
            stripItems={designerStripItems}
          />
        )}
      </Container>
    </div>
  );
}

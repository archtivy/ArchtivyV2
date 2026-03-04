import { notFound, redirect } from "next/navigation";
import { getProjectsCanonicalFiltered, getExploreNetworkCounts } from "@/lib/db/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/db/explore";
import { parseExploreFilters } from "@/lib/explore/filters/parse";
import { exploreFiltersToProjectFilters } from "@/lib/explore/filters/query";
import { getExploreFilterOptions } from "@/lib/explore/filters/options";
import { getPlatformStats } from "@/lib/db/platformActivity";
import { getProfilesForStrip } from "@/lib/db/profiles";
import { getTaxonomyNodeBySlugPath } from "@/lib/taxonomy/taxonomyDb";
import { checkTaxonomySlugRedirect, legacyProjectCategoryToNodeId } from "@/lib/taxonomy/resolve";
import { getTaxonomyNodeById } from "@/lib/taxonomy/taxonomyDb";
import { ExploreEditorialHeader } from "@/components/explore/ExploreEditorialHeader";
import { ExploreProjectsContent } from "@/components/explore/ExploreProjectsContent";
import { ExploreEmptyState } from "@/components/explore/ExploreEmptyState";
import { Container } from "@/components/layout/Container";

export default async function ExploreProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const taxonomySlug = slug?.length ? slug.join("/") : null;

  // Validate taxonomy slug exists in DB
  if (taxonomySlug) {
    const node = await getTaxonomyNodeBySlugPath("project", taxonomySlug);
    if (!node.data) {
      const redir = await checkTaxonomySlugRedirect("project", taxonomySlug);
      if (redir) {
        const redirectParams = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (typeof v === "string") redirectParams.set(k, v);
        }
        const qs = redirectParams.toString();
        redirect(`/explore/projects/${redir}${qs ? `?${qs}` : ""}`);
      }
      notFound();
    }
  }

  // Legacy 301 redirect: ?category=Residential → /explore/projects/residential
  const legacyCategory = typeof sp.category === "string" ? sp.category.trim() : null;
  if (!taxonomySlug && legacyCategory && !legacyCategory.includes(",")) {
    const nodeId = await legacyProjectCategoryToNodeId(legacyCategory);
    if (nodeId) {
      const nodeRes = await getTaxonomyNodeById(nodeId);
      if (nodeRes.data) {
        const cleanParams = new URLSearchParams();
        for (const [k, v] of Object.entries(sp)) {
          if (k === "category" || k === "taxonomy") continue;
          if (typeof v === "string") cleanParams.set(k, v);
        }
        const qs = cleanParams.toString();
        redirect(`/explore/projects/${nodeRes.data.slug_path}${qs ? `?${qs}` : ""}`);
      }
    }
  }

  // Legacy ?taxonomy= redirect → path-based URL
  const rawTaxonomy = typeof sp.taxonomy === "string" ? sp.taxonomy.trim() : null;
  if (!taxonomySlug && rawTaxonomy) {
    const cleanParams = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "taxonomy") continue;
      if (typeof v === "string") cleanParams.set(k, v);
    }
    const qs = cleanParams.toString();
    redirect(`/explore/projects/${rawTaxonomy}${qs ? `?${qs}` : ""}`);
  }

  // Fetch filter options (includes facet slugs for dynamic parsing)
  const options = await getExploreFilterOptions("projects");
  const facetSlugs = options.facets.map((f) => f.slug);

  const filters = parseExploreFilters(sp, "projects", taxonomySlug, facetSlugs);
  const projectFilters = exploreFiltersToProjectFilters(filters);

  const [result, networkCounts, platformStats, designerProfiles] = await Promise.all([
    getProjectsCanonicalFiltered({
      filters: projectFilters,
      limit: EXPLORE_PAGE_SIZE,
      offset: 0,
      sort: filters.sort as "newest" | "year_desc" | "area_desc",
    }),
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

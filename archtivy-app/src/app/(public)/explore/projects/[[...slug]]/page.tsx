import type { Metadata } from "next";
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
import { getBaseUrl } from "@/lib/canonical";
import { buildCollectionPageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const taxonomySlug = slug?.length ? slug.join("/") : null;

  // Taxonomy slug page — use node SEO fields when available
  if (taxonomySlug) {
    const node = await getTaxonomyNodeBySlugPath("project", taxonomySlug);
    const n = node.data;
    if (n) {
      const title = n.seo_title || `${n.label} Projects | Archtivy`;
      const description =
        n.meta_description ||
        n.description ||
        `Browse ${n.label.toLowerCase()} architecture projects on Archtivy.`;
      return {
        title,
        description,
        // Canonical points to the archive page; explore is a filtered view
        alternates: { canonical: `/projects/${n.slug_path}` },
        ...(n.featured_image ? { openGraph: { images: [n.featured_image] } } : {}),
      };
    }
  }

  // Base explore/projects page
  const base: Metadata = {
    title: "Explore Projects — Architecture Portfolio | Archtivy",
    description:
      "Browse architecture projects from around the world. Filter by category, location, materials, and more on Archtivy.",
    alternates: { canonical: "/explore/projects" },
  };
  return base;
}

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

  // Validate taxonomy slug exists in DB; keep node ref for JSON-LD + intro_text
  let taxonomyNode: import("@/lib/taxonomy/taxonomyDb").TaxonomyNode | null = null;
  if (taxonomySlug) {
    const node = await getTaxonomyNodeBySlugPath("project", taxonomySlug);
    taxonomyNode = node.data;
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

  const baseUrl = getBaseUrl();
  const collectionName = taxonomyNode
    ? (taxonomyNode.seo_title || `${taxonomyNode.label} Projects`)
    : "Architecture Projects";
  const collectionDesc = taxonomyNode
    ? (taxonomyNode.meta_description || taxonomyNode.description || `Browse ${taxonomyNode.label.toLowerCase()} projects.`)
    : "Browse architecture projects from around the world on Archtivy.";
  const collectionUrl = taxonomyNode
    ? `${baseUrl}/explore/projects/${taxonomyNode.slug_path}`
    : `${baseUrl}/explore/projects`;
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: collectionName,
    description: collectionDesc,
    url: collectionUrl,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <ExploreEditorialHeader
        type="projects"
        counts={networkCounts}
        options={options}
        currentFilters={filters}
        platformStats={platformStats}
      />

      {taxonomyNode?.intro_text && (
        <Container className="pt-4">
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {taxonomyNode.intro_text}
          </p>
        </Container>
      )}

      <Container className="pb-16 pt-2">
        {filters.q?.trim() && (
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            Results for <span className="font-medium text-zinc-700 dark:text-zinc-300">&quot;{filters.q.trim()}&quot;</span>
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

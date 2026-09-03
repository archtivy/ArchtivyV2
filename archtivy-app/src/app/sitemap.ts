import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getNodeListingCountsWithDescendants } from "@/lib/taxonomy/taxonomyDb";

/**
 * Dynamic sitemap: static pages + all approved projects/products + all public profiles.
 * Uses updated_at for lastModified so Search Console sees meaningful change timestamps.
 */
/** Sitemap always uses the www canonical origin in production. */
function getSitemapBaseUrl(): string {
  const raw = getBaseUrl();
  return raw.replace(/^https:\/\/archtivy\.com(?=\/|$)/, "https://www.archtivy.com");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSitemapBaseUrl();
  const supabase = getSupabaseServiceClient();
  const now = new Date();

  // ✅ Avoid "everything changed today" crawl spam for static pages
  const staticLastMod = process.env.SITEMAP_LASTMOD
    ? new Date(process.env.SITEMAP_LASTMOD)
    : new Date("2026-03-01");

  const staticEntries: MetadataRoute.Sitemap = [
    // No trailing slash: Next resolves the homepage canonical ("/") against
    // metadataBase to exactly `${base}`, and the sitemap <loc> must match the
    // canonical byte-for-byte. Verified against a production build. C-9.
    { url: base,                         lastModified: staticLastMod, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/projects`,           lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/products`,           lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    // /explore (the map tool) is intentionally absent: noindex, ~184 chars of
    // server-rendered content, no crawlable entity links. See C-6.
    // /explore/projects is absent: it now 308s to /projects, which is the one
    // canonical project discovery URL. Listing a permanent redirect in a
    // sitemap points crawlers at a URL that only exists to send them somewhere
    // else.
    // /explore/products is absent for the same reason as /explore/projects:
    // it now 308s to /products. Listing a permanent redirect in a sitemap
    // points crawlers at a URL that exists only to send them elsewhere.
    { url: `${base}/designers`,  lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/brands`,     lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },

    { url: `${base}/about`,              lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vision`,             lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/how-it-works`,       lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/brand-intelligence`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/data-intelligence`,  lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },

    { url: `${base}/faq`,                lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`,            lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/guidelines`,         lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },

    { url: `${base}/partners`,           lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/status`,             lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.3 },

    { url: `${base}/privacy`,            lastModified: staticLastMod, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,              lastModified: staticLastMod, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/cookies`,            lastModified: staticLastMod, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/data-processing`,    lastModified: staticLastMod, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const [projectsRes, productsRes, profilesRes, taxonomyRes, taxMappingRes] = await Promise.all([
    supabase
      .from("listings")
      .select("id, slug, updated_at")
      .eq("type", "project")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("listings")
      .select("id, slug, updated_at")
      .eq("type", "product")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("profiles")
      .select("id, username, updated_at")
      .eq("is_hidden", false)
      .order("updated_at", { ascending: false })
      .limit(5000),
    /*
     * ── .in("domain", …) IS LOAD-BEARING, NOT A TIDY-UP ──────────────────────
     * This selected EVERY active taxonomy node — 1110 rows across 11 domains —
     * and PostgREST caps a response at 1000. The rows come back ordered by
     * domain, so the tail was silently dropped, and the tail is `project`:
     * discipline+intervention_type+material+mood+organization_type = 241,
     * +product = 884, +professional_role = 911, +project = 1028. The cut at
     * 1000 landed 28 rows into `project`, so 28 project categories — including
     * commercial/mixed-use, hospitality/cafe, hospitality/convention-center and
     * landscape-urban/garden, all of which have live projects in them — have
     * been missing from the sitemap. Measured: 937 URLs before this fix, of
     * which 732 were taxonomy pages rather than the expected 760.
     *
     * Only these two domains are ever used below, and 760 rows is inside the
     * cap. Nothing else here needs the other nine.
     */
    supabase
      .from("taxonomy_nodes")
      .select("id, domain, slug_path, updated_at")
      .in("domain", ["project", "product"])
      .eq("is_active", true)
      .order("domain")
      .order("depth", { ascending: true })
      .order("sort_order", { ascending: true }),
    // Fetch primary taxonomy node mapping for each listing (for canonical detail URLs)
    supabase
      .from("listing_taxonomy_node")
      .select("listing_id, taxonomy_node:taxonomy_nodes(slug_path)")
      .eq("is_primary", true),
  ]);

  /*
   * Magazine. Both the index and the articles are added ONLY when at least one
   * article is actually published — the index carries `noindex` until then
   * (derived at request time in its generateMetadata), and listing a noindex
   * page in the sitemap is a contradiction Search Console reports as an error.
   * A missing `articles` table (migration not yet applied) is treated the same
   * as zero articles.
   */
  const magazineRes = await supabase
    .from("articles")
    .select("slug, updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(5000);

  const articleRows = (magazineRes.data ?? []) as { slug: string | null; updated_at: string | null }[];
  const magazineUrls: MetadataRoute.Sitemap =
    articleRows.length === 0
      ? []
      : [
          {
            url: `${base}/magazine`,
            lastModified: staticLastMod,
            changeFrequency: "daily" as const,
            priority: 0.7,
          },
          ...articleRows
            .filter((r): r is { slug: string; updated_at: string | null } => Boolean(r.slug))
            .map((r) => ({
              url: `${base}/magazine/${r.slug}`,
              lastModified: r.updated_at ? new Date(r.updated_at) : now,
              changeFrequency: "monthly" as const,
              priority: 0.7,
            })),
        ];

  const projectRows = (projectsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const productRows = (productsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const profileRows = (profilesRes.data ?? []) as { id: string; username: string | null; updated_at: string | null }[];
  const taxonomyRows = (taxonomyRes.data ?? []) as { id: string; domain: string; slug_path: string; updated_at: string | null }[];

  // Build a map of listing_id → primary taxonomy slug_path
  const taxMappingRaw = taxMappingRes.data ?? [];
  const listingTaxMap = new Map<string, string>();
  for (const row of taxMappingRaw) {
    const r = row as Record<string, unknown>;
    const listingId = r.listing_id as string | undefined;
    const node = r.taxonomy_node as { slug_path?: string } | { slug_path?: string }[] | null;
    const slugPath = Array.isArray(node) ? node[0]?.slug_path : node?.slug_path;
    if (listingId && slugPath) {
      listingTaxMap.set(listingId, slugPath);
    }
  }

  // ✅ Safety buffer toward the 50k URL limit if you increase limits later
  const MAX = 45000;

  const projectUrls: MetadataRoute.Sitemap = projectRows.slice(0, MAX).map((r) => {
    const segment = r.slug ?? r.id;
    const taxSlugPath = listingTaxMap.get(r.id);
    const path = taxSlugPath ? `/projects/${taxSlugPath}/${segment}` : `/projects/${segment}`;
    return {
      url: `${base}${path}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  const productUrls: MetadataRoute.Sitemap = productRows.slice(0, MAX).map((r) => {
    const segment = r.slug ?? r.id;
    const taxSlugPath = listingTaxMap.get(r.id);
    const path = taxSlugPath ? `/products/${taxSlugPath}/${segment}` : `/products/${segment}`;
    return {
      url: `${base}${path}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  // Only username-based profile URLs; exclude /u/id/* (UUID fallback routes).
  const profileUrls: MetadataRoute.Sitemap = profileRows
    .filter((p) => Boolean(p.username?.trim()))
    .slice(0, MAX)
    .map((p) => ({
      url: `${base}/u/${encodeURIComponent(p.username!.trim())}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  /*
   * Archive taxonomy URLs — the canonical /projects/{path} and
   * /products/{path} category pages.
   *
   * ── ONLY CATEGORIES THAT HAVE SOMETHING IN THEM ───────────────────────────
   * This used to submit every active project/product node: 760 URLs. Measured
   * against the live database, only 83 of those have a single approved listing
   * behind them, counting descendants — so 677 of the URLs in the sitemap were
   * pages whose entire content was the empty state. That is a thin-content
   * signal we were volunteering, on a submitted sitemap, at nine times the
   * volume of the real pages.
   *
   * The taxonomy itself is not touched and neither are the URLs: every one of
   * those 677 pages still exists, still renders, still carries its canonical
   * and is still reachable from the Category dropdown and its parent's
   * subcategory links. They are simply not SUBMITTED as pages worth indexing
   * until they hold something. A category that gains its first listing
   * re-enters on the next revalidation, with no migration and no redirect.
   *
   * The count rolls DESCENDANTS up, so /products/furniture qualifies on the
   * strength of the 35 products in its subcategories even though nothing is
   * filed directly against the root — which matches what the page shows, since
   * the directory scopes by slug_path prefix.
   */
  const nodeIdBySlug = new Map<string, string>();
  for (const t of taxonomyRows) {
    if (t.domain === "project" || t.domain === "product") {
      nodeIdBySlug.set(`${t.domain}:${t.slug_path}`, t.id);
    }
  }
  const [projectNodeCounts, productNodeCounts] = await Promise.all([
    getNodeListingCountsWithDescendants("project"),
    getNodeListingCountsWithDescendants("product"),
  ]);
  const countFor = (domain: "project" | "product", slugPath: string): number => {
    const counts = (domain === "project" ? projectNodeCounts.data : productNodeCounts.data) ?? {};
    const id = nodeIdBySlug.get(`${domain}:${slugPath}`);
    // A count query that FAILED must not silently empty the sitemap of every
    // category page, so an absent counts map falls back to including the node.
    if (domain === "project" ? projectNodeCounts.error : productNodeCounts.error) return 1;
    if (!id) return 0;
    return counts[id] ?? 0;
  };

  const taxonomyUrls: MetadataRoute.Sitemap = taxonomyRows
    .filter((t) => t.domain === "project" || t.domain === "product")
    .filter((t) => countFor(t.domain as "project" | "product", t.slug_path) > 0)
    .slice(0, MAX)
    .map((t) => {
      return {
        url: `${base}${getArchiveCategoryUrl(t.domain as "project" | "product", t.slug_path)}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : staticLastMod,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  return [
    ...staticEntries,
    ...taxonomyUrls,
    ...projectUrls,
    ...productUrls,
    ...profileUrls,
    ...magazineUrls,
  ];
}
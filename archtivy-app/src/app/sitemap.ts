import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";
import { getArchiveCategoryUrl } from "@/lib/archive/urls";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

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
    { url: base,                         lastModified: staticLastMod, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/projects`,           lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/products`,           lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore`,            lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/projects`,   lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/explore/products`,   lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/explore/designers`,  lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/explore/brands`,     lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.8 },

    { url: `${base}/about`,              lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vision`,             lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/how-it-works`,       lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/brand-intelligence`, lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/data-intelligence`,  lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.6 },

    { url: `${base}/faq`,                lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`,            lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/guidelines`,         lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press`,              lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/press-kit`,          lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/api-docs`,           lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.5 },

    { url: `${base}/partners`,           lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/careers`,            lastModified: staticLastMod, changeFrequency: "monthly", priority: 0.4 },
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
    supabase
      .from("taxonomy_nodes")
      .select("domain, slug_path, updated_at")
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

  const projectRows = (projectsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const productRows = (productsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const profileRows = (profilesRes.data ?? []) as { id: string; username: string | null; updated_at: string | null }[];
  const taxonomyRows = (taxonomyRes.data ?? []) as { domain: string; slug_path: string; updated_at: string | null }[];

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

  // Archive taxonomy URLs — canonical archive pages (not explore)
  const taxonomyUrls: MetadataRoute.Sitemap = taxonomyRows
    .filter((t) => t.domain === "project" || t.domain === "product")
    .map((t) => {
      return {
        url: `${base}${getArchiveCategoryUrl(t.domain as "project" | "product", t.slug_path)}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : staticLastMod,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

  return [...staticEntries, ...taxonomyUrls, ...projectUrls, ...productUrls, ...profileUrls];
}
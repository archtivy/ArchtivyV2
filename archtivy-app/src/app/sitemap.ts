import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Dynamic sitemap: static pages + all approved projects/products + all public profiles.
 * Uses updated_at for lastModified so Search Console sees meaningful change timestamps.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const supabase = getSupabaseServiceClient();
  const now = new Date();

  // ✅ Avoid "everything changed today" crawl spam for static pages
  const staticLastMod = process.env.SITEMAP_LASTMOD
    ? new Date(process.env.SITEMAP_LASTMOD)
    : new Date("2026-03-01");

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base,                         lastModified: staticLastMod, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/explore`,            lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/projects`,   lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/products`,   lastModified: staticLastMod, changeFrequency: "daily",   priority: 0.9 },
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

  const [projectsRes, productsRes, profilesRes] = await Promise.all([
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
  ]);

  const projectRows = (projectsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const productRows = (productsRes.data ?? []) as { id: string; slug: string | null; updated_at: string | null }[];
  const profileRows = (profilesRes.data ?? []) as { id: string; username: string | null; updated_at: string | null }[];

  // ✅ Safety buffer toward the 50k URL limit if you increase limits later
  const MAX = 45000;

  const projectUrls: MetadataRoute.Sitemap = projectRows.slice(0, MAX).map((r) => ({
    url: `${base}/projects/${r.slug ?? r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productUrls: MetadataRoute.Sitemap = productRows.slice(0, MAX).map((r) => ({
    url: `${base}/products/${r.slug ?? r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const profileUrls: MetadataRoute.Sitemap = profileRows.slice(0, MAX).map((p) => {
    const username = p.username?.trim();
    return {
      url: username ? `${base}/u/${encodeURIComponent(username)}` : `${base}/u/id/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: username ? 0.6 : 0.4,
    };
  });

  return [...staticEntries, ...projectUrls, ...productUrls, ...profileUrls];
}
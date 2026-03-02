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

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base,                        lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: `${base}/explore`,           lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/projects`,  lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/products`,  lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: `${base}/explore/designers`, lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/explore/brands`,    lastModified: now, changeFrequency: "daily",   priority: 0.8 },
    { url: `${base}/about`,             lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/how-it-works`,      lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`,               lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`,           lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/guidelines`,        lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`,           lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,             lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
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

  const projectUrls: MetadataRoute.Sitemap = projectRows.map((r) => ({
    url: `${base}/projects/${r.slug ?? r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const productUrls: MetadataRoute.Sitemap = productRows.map((r) => ({
    url: `${base}/products/${r.slug ?? r.id}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Claimed profiles: canonical /u/[username]. Unclaimed/seed: /u/id/[id] at lower priority.
  const profileUrls: MetadataRoute.Sitemap = profileRows.map((p) => ({
    url: p.username?.trim()
      ? `${base}/u/${encodeURIComponent(p.username.trim())}`
      : `${base}/u/id/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly" as const,
    priority: p.username?.trim() ? 0.6 : 0.4,
  }));

  return [...staticEntries, ...projectUrls, ...productUrls, ...profileUrls];
}

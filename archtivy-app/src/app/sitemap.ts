import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/canonical";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/** Minimal sitemap: homepage, explore, public listings (projects/products), and public profiles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const supabase = getSupabaseServiceClient();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/explore/projects`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/explore/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const [projectsRes, productsRes, profilesRes] = await Promise.all([
    supabase.from("listings").select("id, slug").eq("type", "project").eq("status", "APPROVED").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5000),
    supabase.from("listings").select("id, slug").eq("type", "product").eq("status", "APPROVED").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5000),
    supabase.from("profiles").select("id, username").eq("is_hidden", false).not("username", "is", null).limit(5000),
  ]);

  const projectRows = (projectsRes.data ?? []) as { id: string; slug: string | null }[];
  const productRows = (productsRes.data ?? []) as { id: string; slug: string | null }[];
  const profileRows = (profilesRes.data ?? []) as { id: string; username: string | null }[];

  const projectUrls: MetadataRoute.Sitemap = projectRows.map((r) => ({
    url: `${base}/projects/${r.slug ?? r.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const productUrls: MetadataRoute.Sitemap = productRows.map((r) => ({
    url: `${base}/products/${r.slug ?? r.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const profileUrls: MetadataRoute.Sitemap = profileRows
    .filter((p) => p.username?.trim())
    .map((p) => ({
      url: `${base}/u/${encodeURIComponent(p.username!.trim())}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticEntries, ...projectUrls, ...productUrls, ...profileUrls];
}

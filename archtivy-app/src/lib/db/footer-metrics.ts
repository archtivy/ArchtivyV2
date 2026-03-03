/**
 * Footer metrics: platform stats for the footer CTA and intelligence strip.
 * All queries are cached (revalidate: 3600) so the footer updates hourly.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const FOOTER_METRICS_REVALIDATE = 3600;

// ─── Legacy: total connections ────────────────────────────────────────────────

export async function getTotalConnections(): Promise<number> {
  const sup = getSupabaseServiceClient();
  let total = 0;

  const { count: pplCount, error: pplErr } = await sup
    .from("project_product_links")
    .select("project_id", { count: "exact", head: true });

  if (!pplErr && pplCount != null) {
    total += pplCount;
  }

  const { count: connCount, error: connErr } = await sup
    .from("connections")
    .select("from_id", { count: "exact", head: true });

  if (!connErr && connCount != null) {
    total += connCount;
  }

  return total;
}

export const getCachedTotalConnections = unstable_cache(
  getTotalConnections,
  ["footer-total-connections"],
  { revalidate: FOOTER_METRICS_REVALIDATE }
);

// ─── Platform metrics (new footer) ───────────────────────────────────────────

export interface PlatformMetrics {
  projects: number;
  products: number;
  professionals: number;
  countries: number;
}

export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const sup = getSupabaseServiceClient();

  const [
    { count: projectCount },
    { count: productCount },
    { count: professionalCount },
    { data: countryRows },
  ] = await Promise.all([
    sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("type", "project")
      .is("deleted_at", null),
    sup
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("type", "product")
      .is("deleted_at", null),
    sup
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    sup
      .from("listings")
      .select("location_country")
      .is("deleted_at", null)
      .not("location_country", "is", null),
  ]);

  const countries = new Set(
    (countryRows ?? [])
      .map((r: { location_country: string | null }) => r.location_country)
      .filter(Boolean)
  ).size;

  return {
    projects: projectCount ?? 0,
    products: productCount ?? 0,
    professionals: professionalCount ?? 0,
    countries,
  };
}

export const getCachedPlatformMetrics = unstable_cache(
  getPlatformMetrics,
  ["footer-platform-metrics"],
  { revalidate: FOOTER_METRICS_REVALIDATE }
);

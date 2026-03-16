/**
 * Explore Intelligence: aggregation queries for the Intelligence view.
 * Builds on top of existing queries.ts — adds material analytics and co-occurrence.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const LISTING_STATUS = "APPROVED";

// ─── Material Usage ─────────────────────────────────────────────────────────

export interface MaterialUsage {
  material_id: string;
  display_name: string;
  slug: string;
  project_count: number;
}

/**
 * Top N most-used materials across approved projects.
 * Query: project_material_links JOIN project_materials, group by material_id.
 */
export async function getMaterialUsage(limit = 20): Promise<MaterialUsage[]> {
  const sup = getSupabaseServiceClient();

  // Get all approved project IDs
  const { data: projects } = await sup
    .from("listings")
    .select("id")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return [];

  // Get all material links for those projects
  const { data: links } = await sup
    .from("project_material_links")
    .select("project_id, material_id")
    .in("project_id", projectIds);

  if (!links?.length) return [];

  // Count by material_id
  const counts: Record<string, number> = {};
  for (const row of links as { material_id: string }[]) {
    counts[row.material_id] = (counts[row.material_id] ?? 0) + 1;
  }

  // Get material names
  const materialIds = Object.keys(counts);
  const { data: materials } = await sup
    .from("project_materials")
    .select("id, display_name, slug")
    .in("id", materialIds);

  const matMap = new Map(
    (materials ?? []).map((m: { id: string; display_name: string; slug: string }) => [m.id, m])
  );

  return Object.entries(counts)
    .map(([id, count]) => {
      const mat = matMap.get(id);
      return {
        material_id: id,
        display_name: mat?.display_name ?? id,
        slug: mat?.slug ?? id,
        project_count: count,
      };
    })
    .sort((a, b) => b.project_count - a.project_count)
    .slice(0, limit);
}

// ─── Material Co-occurrence ─────────────────────────────────────────────────

export interface MaterialCoOccurrence {
  material_a: string;
  material_b: string;
  label_a: string;
  label_b: string;
  co_count: number;
}

/**
 * Materials that frequently appear together in the same project.
 * For each project, enumerate all material pairs; count pair frequency.
 */
export async function getMaterialCoOccurrence(limit = 20): Promise<MaterialCoOccurrence[]> {
  const sup = getSupabaseServiceClient();

  const { data: projects } = await sup
    .from("listings")
    .select("id")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  if (projectIds.length === 0) return [];

  const { data: links } = await sup
    .from("project_material_links")
    .select("project_id, material_id")
    .in("project_id", projectIds);

  if (!links?.length) return [];

  // Group materials by project
  const byProject: Record<string, string[]> = {};
  for (const row of links as { project_id: string; material_id: string }[]) {
    if (!byProject[row.project_id]) byProject[row.project_id] = [];
    byProject[row.project_id].push(row.material_id);
  }

  // Count pairs
  const pairCounts: Record<string, number> = {};
  for (const mats of Object.values(byProject)) {
    if (mats.length < 2) continue;
    const sorted = [...new Set(mats)].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}||${sorted[j]}`;
        pairCounts[key] = (pairCounts[key] ?? 0) + 1;
      }
    }
  }

  // Top pairs
  const topPairs = Object.entries(pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Resolve names
  const allIds = new Set<string>();
  for (const [key] of topPairs) {
    const [a, b] = key.split("||");
    allIds.add(a);
    allIds.add(b);
  }
  const { data: materials } = await sup
    .from("project_materials")
    .select("id, display_name")
    .in("id", Array.from(allIds));

  const nameMap = new Map(
    (materials ?? []).map((m: { id: string; display_name: string }) => [m.id, m.display_name])
  );

  return topPairs.map(([key, count]) => {
    const [a, b] = key.split("||");
    return {
      material_a: a,
      material_b: b,
      label_a: nameMap.get(a) ?? a,
      label_b: nameMap.get(b) ?? b,
      co_count: count,
    };
  });
}

// ─── Projects per Country ───────────────────────────────────────────────────

export interface CountryCount {
  country: string;
  count: number;
}

export async function getProjectsByCountry(limit = 30): Promise<CountryCount[]> {
  const sup = getSupabaseServiceClient();

  const { data: rows } = await sup
    .from("listings")
    .select("location_country")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null)
    .not("location_country", "is", null);

  if (!rows?.length) return [];

  const counts: Record<string, number> = {};
  for (const row of rows as { location_country: string | null }[]) {
    const c = row.location_country?.trim();
    if (c) counts[c] = (counts[c] ?? 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([country, count]) => ({ country, count }));
}

// ─── Brand Penetration ──────────────────────────────────────────────────────

export interface BrandPenetration {
  brand_id: string;
  brand_name: string;
  project_count: number;
  country_count: number;
  categories: string[];
}

export async function getBrandPenetration(limit = 15): Promise<BrandPenetration[]> {
  const sup = getSupabaseServiceClient();

  const { data: projects } = await sup
    .from("listings")
    .select("id, location_country, project_category, category")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);

  const projectList = (projects ?? []) as {
    id: string;
    location_country: string | null;
    project_category: string | null;
    category: string | null;
  }[];
  const projectMap = new Map(projectList.map((p) => [p.id, p]));
  const projectIds = projectList.map((p) => p.id);
  if (projectIds.length === 0) return [];

  const { data: pblRows } = await sup
    .from("project_brand_links")
    .select("brand_profile_id, project_id")
    .in("project_id", projectIds);

  if (!pblRows?.length) return [];

  const brandData: Record<
    string,
    { projects: Set<string>; countries: Set<string>; categories: Set<string> }
  > = {};

  for (const row of pblRows as { brand_profile_id: string; project_id: string }[]) {
    const bid = row.brand_profile_id;
    if (!brandData[bid]) {
      brandData[bid] = { projects: new Set(), countries: new Set(), categories: new Set() };
    }
    brandData[bid].projects.add(row.project_id);
    const proj = projectMap.get(row.project_id);
    if (proj?.location_country?.trim()) brandData[bid].countries.add(proj.location_country.trim());
    const cat = (proj?.project_category ?? proj?.category ?? "").trim();
    if (cat) brandData[bid].categories.add(cat);
  }

  const sorted = Object.entries(brandData)
    .sort((a, b) => b[1].projects.size - a[1].projects.size)
    .slice(0, limit);

  const brandIds = sorted.map(([id]) => id);
  const { data: profiles } = await sup
    .from("profiles")
    .select("id, display_name, username")
    .in("id", brandIds);

  const nameMap = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [
      p.id,
      p.display_name || p.username || "Brand",
    ])
  );

  return sorted.map(([id, data]) => ({
    brand_id: id,
    brand_name: nameMap.get(id) ?? "Brand",
    project_count: data.projects.size,
    country_count: data.countries.size,
    categories: Array.from(data.categories).slice(0, 5),
  }));
}

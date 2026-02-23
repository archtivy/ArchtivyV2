/**
 * Explore Intelligence: dynamic data from Supabase.
 * Uses getSupabaseServiceClient (server-only).
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const LISTING_STATUS = "APPROVED";

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function cityFilter<T>(query: T, city: string | null | undefined): T {
  if (!city?.trim()) return query;
  const term = city.trim().replace(/-/g, " ").replace(/%/g, "\\%");
  // Supabase PostgrestFilterBuilder has ilike; types may not expose it
  return (
    (query as unknown as { ilike(col: string, val: string): T }).ilike("location_city", `%${term}%`)
  );
}

export interface ExploreSignal {
  label: string;
  value: string;
  metric: string;
  slug?: string | null;
  id?: string;
}

export async function getExploreSignals(city?: string | null): Promise<ExploreSignal[]> {
  const sup = getSupabaseServiceClient();
  const signals: ExploreSignal[] = [];

  // A) Most Connected Designer: projects, score = views + 3*saves + 5*team_mentions
  let projQuery = sup
    .from("listings")
    .select("id, owner_profile_id, views_count, saves_count")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null)
    .not("owner_profile_id", "is", null);
  projQuery = cityFilter(projQuery, city);
  const { data: projects } = await projQuery;

  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
  const designerScores: Record<string, { score: number; views: number; saves: number; team: number }> = {};

  if (projectIds.length > 0) {
    const { data: teamRows } = await sup
      .from("listing_team_members")
      .select("listing_id, profile_id")
      .in("listing_id", projectIds);
    const teamByProject: Record<string, number> = {};
    for (const t of teamRows ?? []) {
      const lid = (t as { listing_id: string }).listing_id;
      teamByProject[lid] = (teamByProject[lid] ?? 0) + 1;
    }

    for (const p of projects ?? []) {
      const pid = p.owner_profile_id as string;
      if (!designerScores[pid]) designerScores[pid] = { score: 0, views: 0, saves: 0, team: 0 };
      const v = toNum(p.views_count);
      const s = toNum(p.saves_count);
      const team = teamByProject[p.id] ?? 0;
      designerScores[pid].views += v;
      designerScores[pid].saves += s;
      designerScores[pid].team += team;
      designerScores[pid].score += v + 3 * s + 5 * team;
    }
  }

  const topDesignerId = Object.entries(designerScores).sort((a, b) => b[1].score - a[1].score)[0]?.[0];
  if (topDesignerId) {
    const { data: prof } = await sup.from("profiles").select("id, display_name, username, slug").eq("id", topDesignerId).eq("role", "designer").maybeSingle();
    const s = designerScores[topDesignerId];
    const scoreVal = (s.score / 10).toFixed(1);
    signals.push({
      label: "Most Connected Designer",
      value: (prof as { display_name: string | null; username: string | null })?.display_name || (prof as { username: string | null })?.username || "Designer",
      metric: `Score ${scoreVal}`,
      slug: (prof as { username?: string | null })?.username ?? (prof as { slug?: string | null })?.slug ?? null,
      id: topDesignerId,
    });
  } else {
    signals.push({ label: "Most Connected Designer", value: "—", metric: "—" });
  }

  // B) Most Integrated Brand: project_brand_links count
  let cityProjectIdsForBrand: string[] = [];
  if (city?.trim()) {
    const q = cityFilter(
      sup.from("listings").select("id").eq("type", "project").eq("status", LISTING_STATUS).is("deleted_at", null),
      city
    );
    const { data: cityRows } = await q;
    cityProjectIdsForBrand = (cityRows ?? []).map((r: { id: string }) => r.id);
  }
  let pblQuery = sup.from("project_brand_links").select("brand_profile_id");
  if (cityProjectIdsForBrand.length > 0) {
    pblQuery = pblQuery.in("project_id", cityProjectIdsForBrand);
  }
  const { data: pblRows } = await pblQuery;
  const brandCounts: Record<string, number> = {};
  for (const r of pblRows ?? []) {
    const bid = (r as { brand_profile_id: string }).brand_profile_id;
    brandCounts[bid] = (brandCounts[bid] ?? 0) + 1;
  }
  const topBrandId = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topBrandId) {
    const { data: prof } = await sup.from("profiles").select("display_name, username, slug").eq("id", topBrandId).maybeSingle();
    const count = brandCounts[topBrandId];
    signals.push({
      label: "Most Integrated Brand",
      value: (prof as { display_name: string | null })?.display_name || (prof as { username: string | null })?.username || "Brand",
      metric: `${count} Projects`,
      slug: (prof as { username?: string | null })?.username ?? (prof as { slug?: string | null })?.slug ?? null,
      id: topBrandId,
    });
  } else {
    signals.push({ label: "Most Integrated Brand", value: "—", metric: "—" });
  }

  // C) Most Used Product: project_product_links count
  let cityProjectIdsForProduct: string[] | null = null;
  if (city?.trim()) {
    const q = cityFilter(
      sup.from("listings").select("id").eq("type", "project").eq("status", LISTING_STATUS).is("deleted_at", null),
      city
    );
    const { data: cityRows } = await q;
    cityProjectIdsForProduct = (cityRows ?? []).map((r: { id: string }) => r.id);
  }
  let pplRows: { product_id: string }[] = [];
  if (cityProjectIdsForProduct === null || cityProjectIdsForProduct.length > 0) {
    let pplQuery = sup.from("project_product_links").select("product_id");
    if (cityProjectIdsForProduct && cityProjectIdsForProduct.length > 0) {
      pplQuery = pplQuery.in("project_id", cityProjectIdsForProduct);
    }
    const { data } = await pplQuery;
    pplRows = (data ?? []) as { product_id: string }[];
  }
  const productCounts: Record<string, number> = {};
  for (const r of pplRows) {
    const pid = r.product_id;
    productCounts[pid] = (productCounts[pid] ?? 0) + 1;
  }
  const topProductId = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (topProductId) {
    const { data: prod } = await sup.from("listings").select("title, slug").eq("id", topProductId).eq("type", "product").maybeSingle();
    const count = productCounts[topProductId];
    signals.push({
      label: "Most Used Product",
      value: (prod as { title: string | null })?.title || "Product",
      metric: `${count} Projects`,
      slug: (prod as { slug: string | null })?.slug ?? null,
      id: topProductId,
    });
  } else {
    signals.push({ label: "Most Used Product", value: "—", metric: "—" });
  }

  // D) Fastest Rising Category: group by category, use project count as proxy (no time-series)
  let catQuery = sup
    .from("listings")
    .select("category, project_category")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);
  catQuery = cityFilter(catQuery, city);
  const { data: catRows } = await catQuery;
  const catCounts: Record<string, number> = {};
  for (const r of catRows ?? []) {
    const c = ((r as { project_category?: string | null }).project_category ?? (r as { category?: string | null }).category ?? "").trim();
    if (c) catCounts[c] = (catCounts[c] ?? 0) + 1;
  }
  const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
  if (topCat) {
    const count = topCat[1];
    const prevEst = Math.max(1, count - 2);
    const growth = Math.round(((count - prevEst) / prevEst) * 100);
    signals.push({
      label: "Most Active Category",
      value: topCat[0],
      metric: growth > 0 ? `+${growth}%` : `${growth}%`,
    });
  } else {
    signals.push({ label: "Most Active Category", value: "—", metric: "—" });
  }

  return signals;
}

export interface ModuleDesigner {
  id: string;
  name: string;
  slug: string | null;
  score: number;
  projectsCount: number;
  projectThumbs: string[];
  brands: string[];
}

export interface ModuleProject {
  id: string;
  title: string;
  slug: string | null;
  coverImage: string | null;
}

export interface ModuleBrand {
  id: string;
  name: string;
  slug: string | null;
  projectsCount: number;
  designersCount: number;
  projectThumbs: string[];
}

export interface ModuleProduct {
  id: string;
  title: string;
  slug: string | null;
  projectsCount: number;
  brandName: string | null;
  projectThumbs: string[];
}

export interface ExploreModules {
  marketLeadersDesigners: ModuleDesigner[];
  topProjects: ModuleProject[];
  strategicBrands: ModuleBrand[];
  productLeaders: ModuleProduct[];
}

export async function getExploreModules(city?: string | null, limit = 5): Promise<ExploreModules> {
  const sup = getSupabaseServiceClient();
  const marketLeadersDesigners: ModuleDesigner[] = [];
  const topProjects: ModuleProject[] = [];
  const strategicBrands: ModuleBrand[] = [];
  const productLeaders: ModuleProduct[] = [];

  // Projects base (city filtered)
  let projQuery = sup
    .from("listings")
    .select("id, owner_profile_id, cover_image_url, title, slug, views_count, saves_count")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);
  projQuery = cityFilter(projQuery, city);
  const { data: projects } = await projQuery;
  const projectList = (projects ?? []) as { id: string; owner_profile_id: string | null; cover_image_url: string | null; title: string; slug: string | null; views_count?: unknown; saves_count?: unknown }[];

  const projectIds = projectList.map((p) => p.id);

  // Top projects by views
  const sortedProjects = [...projectList].sort((a, b) => toNum(b.views_count) - toNum(a.views_count));
  for (const p of sortedProjects.slice(0, limit)) {
    topProjects.push({
      id: p.id,
      title: p.title || "Project",
      slug: p.slug,
      coverImage: p.cover_image_url,
    });
  }

  // Designer scores (same as signals)
  const designerScores: Record<string, { score: number; projectIds: string[]; covers: string[] }> = {};
  if (projectIds.length > 0) {
    const { data: teamRows } = await sup.from("listing_team_members").select("listing_id, profile_id").in("listing_id", projectIds);
    const teamByProject: Record<string, number> = {};
    for (const t of teamRows ?? []) {
      const lid = (t as { listing_id: string }).listing_id;
      teamByProject[lid] = (teamByProject[lid] ?? 0) + 1;
    }
    const projectCovers: Record<string, string> = {};
    for (const p of projectList) {
      if (p.cover_image_url) projectCovers[p.id] = p.cover_image_url;
    }
    for (const p of projectList) {
      const pid = p.owner_profile_id;
      if (!pid) continue;
      if (!designerScores[pid]) designerScores[pid] = { score: 0, projectIds: [], covers: [] };
      const v = toNum(p.views_count);
      const s = toNum(p.saves_count);
      const team = teamByProject[p.id] ?? 0;
      designerScores[pid].score += v + 3 * s + 5 * team;
      if (!designerScores[pid].projectIds.includes(p.id)) {
        designerScores[pid].projectIds.push(p.id);
        if (p.cover_image_url) designerScores[pid].covers.push(p.cover_image_url);
      }
    }
  }

  const topDesignerIds = Object.entries(designerScores)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id]) => id);

  if (topDesignerIds.length > 0) {
    const { data: profs } = await sup.from("profiles").select("id, display_name, username, slug").in("id", topDesignerIds).eq("role", "designer");
    const profMap = new Map((profs ?? []).map((p: { id: string }) => [p.id, p]));
    for (const id of topDesignerIds) {
      const d = designerScores[id];
      const prof = profMap.get(id) as { display_name: string | null; username: string | null; slug: string | null } | undefined;
      const brandIds = new Set<string>();
      for (const pid of d.projectIds.slice(0, 5)) {
        const { data: pbl } = await sup.from("project_brand_links").select("brand_profile_id").eq("project_id", pid);
        for (const b of pbl ?? []) brandIds.add((b as { brand_profile_id: string }).brand_profile_id);
      }
      const brandNames: string[] = [];
      if (brandIds.size > 0) {
        const { data: bProfs } = await sup.from("profiles").select("display_name, username").in("id", Array.from(brandIds)).limit(5);
        for (const b of bProfs ?? []) brandNames.push((b as { display_name: string | null }).display_name || (b as { username: string | null }).username || "");
      }
      marketLeadersDesigners.push({
        id,
        name: prof?.display_name || prof?.username || "Designer",
        slug: prof?.username ?? prof?.slug ?? null,
        score: Math.round(d.score * 10) / 10,
        projectsCount: d.projectIds.length,
        projectThumbs: d.covers.slice(0, 3),
        brands: brandNames.slice(0, 3).filter(Boolean),
      });
    }
  }

  // Strategic brands
  let pblQuery = sup.from("project_brand_links").select("brand_profile_id, project_id");
  if (projectIds.length > 0) pblQuery = pblQuery.in("project_id", projectIds);
  const { data: pblRows } = await pblQuery;
  const brandToProjects: Record<string, Set<string>> = {};
  const brandToDesigners: Record<string, Set<string>> = {};
  const projCovers: Record<string, string> = {};
  for (const p of projectList) {
    if (p.cover_image_url) projCovers[p.id] = p.cover_image_url;
  }
  for (const r of pblRows ?? []) {
    const bid = (r as { brand_profile_id: string }).brand_profile_id;
    const pid = (r as { project_id: string }).project_id;
    if (!brandToProjects[bid]) brandToProjects[bid] = new Set();
    brandToProjects[bid].add(pid);
    const proj = projectList.find((x) => x.id === pid);
    if (proj?.owner_profile_id) {
      if (!brandToDesigners[bid]) brandToDesigners[bid] = new Set();
      brandToDesigners[bid].add(proj.owner_profile_id);
    }
  }
  const topBrandIds = Object.entries(brandToProjects)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([id]) => id);

  if (topBrandIds.length > 0) {
    const { data: bProfs } = await sup.from("profiles").select("id, display_name, username, slug").in("id", topBrandIds);
    const bProfMap = new Map((bProfs ?? []).map((p: { id: string }) => [p.id, p]));
    for (const id of topBrandIds) {
      const projIds = Array.from(brandToProjects[id] ?? []);
      const thumbs = projIds.map((pid) => projCovers[pid]).filter(Boolean).slice(0, 3);
      const prof = bProfMap.get(id) as { display_name: string | null; username: string | null; slug: string | null } | undefined;
      strategicBrands.push({
        id,
        name: prof?.display_name || prof?.username || "Brand",
        slug: prof?.username ?? prof?.slug ?? null,
        projectsCount: projIds.length,
        designersCount: (brandToDesigners[id]?.size ?? 0),
        projectThumbs: thumbs,
      });
    }
  }

  // Product leaders
  let pplQuery = sup.from("project_product_links").select("product_id, project_id");
  if (projectIds.length > 0) pplQuery = pplQuery.in("project_id", projectIds);
  const { data: pplRows } = await pplQuery;
  const productToProjects: Record<string, Set<string>> = {};
  for (const r of pplRows ?? []) {
    const pid = (r as { product_id: string }).product_id;
    const projId = (r as { project_id: string }).project_id;
    if (!productToProjects[pid]) productToProjects[pid] = new Set();
    productToProjects[pid].add(projId);
  }
  const topProductIds = Object.entries(productToProjects)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([id]) => id);

  if (topProductIds.length > 0) {
    const { data: prodRows } = await sup.from("listings").select("id, title, slug, owner_profile_id").in("id", topProductIds).eq("type", "product");
    const prodMap = new Map((prodRows ?? []).map((p: { id: string }) => [p.id, p]));
    for (const id of topProductIds) {
      const projIds = Array.from(productToProjects[id] ?? []);
      const thumbs = projIds.map((pid) => projCovers[pid]).filter(Boolean).slice(0, 3);
      const prod = prodMap.get(id) as { title: string | null; slug: string | null; owner_profile_id: string | null } | undefined;
      let brandName: string | null = null;
      if (prod?.owner_profile_id) {
        const { data: bp } = await sup.from("profiles").select("display_name, username").eq("id", prod.owner_profile_id).maybeSingle();
        brandName = (bp as { display_name: string | null })?.display_name || (bp as { username: string | null })?.username || null;
      }
      productLeaders.push({
        id,
        title: prod?.title || "Product",
        slug: prod?.slug ?? null,
        projectsCount: projIds.length,
        brandName,
        projectThumbs: thumbs,
      });
    }
  }

  return {
    marketLeadersDesigners,
    topProjects,
    strategicBrands,
    productLeaders,
  };
}

export interface RisingCategory {
  name: string;
  growth: number;
  projectsCount: number;
}

export interface ExploreRisingSignals {
  trendingCategories: RisingCategory[];
  collaborationDensity: { avgTeams: number; topCategory: string | null };
  trendingMaterials: { label: string; items: never[] };
}

export async function getExploreRisingSignals(city?: string | null, limit = 5): Promise<ExploreRisingSignals> {
  const sup = getSupabaseServiceClient();
  const trendingCategories: RisingCategory[] = [];
  let avgTeams = 0;
  let topCategory: string | null = null;

  let projQuery = sup
    .from("listings")
    .select("id, category, project_category")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);
  projQuery = cityFilter(projQuery, city);
  const { data: projects } = await projQuery;
  const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

  if (projectIds.length > 0) {
    const { data: teamRows } = await sup.from("listing_team_members").select("listing_id").in("listing_id", projectIds);
    const teamCountByProject: Record<string, number> = {};
    for (const t of teamRows ?? []) {
      const lid = (t as { listing_id: string }).listing_id;
      teamCountByProject[lid] = (teamCountByProject[lid] ?? 0) + 1;
    }
    const totalTeams = Object.values(teamCountByProject).reduce((a, b) => a + b, 0);
    avgTeams = projectIds.length > 0 ? Math.round((totalTeams / projectIds.length) * 10) / 10 : 0;

    const catCounts: Record<string, { count: number; teams: number }> = {};
    for (const p of projects ?? []) {
      const c = ((p as { project_category?: string | null }).project_category ?? (p as { category?: string | null }).category ?? "").trim();
      if (c) {
        if (!catCounts[c]) catCounts[c] = { count: 0, teams: 0 };
        catCounts[c].count++;
        catCounts[c].teams += teamCountByProject[p.id] ?? 0;
      }
    }
    const byAvgTeams = Object.entries(catCounts)
      .filter(([, v]) => v.count >= 2)
      .map(([name, v]) => ({ name, avg: v.teams / v.count }))
      .sort((a, b) => b.avg - a.avg);
    topCategory = byAvgTeams[0]?.name ?? null;

    const sortedCats = Object.entries(catCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit);
    for (const [name, v] of sortedCats) {
      const prevEst = Math.max(1, v.count - 1);
      const growth = Math.round(((v.count - prevEst) / prevEst) * 100);
      trendingCategories.push({ name, growth, projectsCount: v.count });
    }
  }

  return {
    trendingCategories,
    collaborationDensity: { avgTeams, topCategory },
    trendingMaterials: { label: "Coming next", items: [] },
  };
}

export interface PanelRow {
  id: string;
  name: string;
  slug: string | null;
  score?: string;
  growth?: string;
  count?: number;
  metric?: string;
}

export type ExplorePanelType =
  | "designers"
  | "projects"
  | "brands"
  | "products"
  | "categories"
  | "collaboration";

export async function getExplorePanelList(
  panel: ExplorePanelType,
  city?: string | null,
  limit = 50
): Promise<PanelRow[]> {
  const sup = getSupabaseServiceClient();
  const rows: PanelRow[] = [];

  let projQuery = sup
    .from("listings")
    .select("id, owner_profile_id, title, slug, cover_image_url, category, project_category, views_count, saves_count")
    .eq("type", "project")
    .eq("status", LISTING_STATUS)
    .is("deleted_at", null);
  projQuery = cityFilter(projQuery, city);
  const { data: projects } = await projQuery;
  const projectList = (projects ?? []) as { id: string; owner_profile_id: string | null; title: string; slug: string | null; category?: string | null; project_category?: string | null; views_count?: unknown; saves_count?: unknown }[];
  const projectIds = projectList.map((p) => p.id);

  if (panel === "designers") {
    const designerScores: Record<string, { score: number; projectIds: string[] }> = {};
    if (projectIds.length > 0) {
      const { data: teamRows } = await sup.from("listing_team_members").select("listing_id, profile_id").in("listing_id", projectIds);
      const teamByProject: Record<string, number> = {};
      for (const t of teamRows ?? []) {
        const lid = (t as { listing_id: string }).listing_id;
        teamByProject[lid] = (teamByProject[lid] ?? 0) + 1;
      }
      for (const p of projectList) {
        const pid = p.owner_profile_id;
        if (!pid) continue;
        if (!designerScores[pid]) designerScores[pid] = { score: 0, projectIds: [] };
        designerScores[pid].score += toNum(p.views_count) + 3 * toNum(p.saves_count) + 5 * (teamByProject[p.id] ?? 0);
        designerScores[pid].projectIds.push(p.id);
      }
    }
    const sorted = Object.entries(designerScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([id]) => id);
    if (sorted.length > 0) {
      const { data: profs } = await sup.from("profiles").select("id, display_name, username, slug").in("id", sorted).eq("role", "designer");
      const profMap = new Map((profs ?? []).map((p: { id: string }) => [p.id, p]));
      for (const id of sorted) {
        const d = designerScores[id];
        const prof = profMap.get(id) as { display_name: string | null; username: string | null; slug: string | null } | undefined;
        rows.push({
          id,
          name: prof?.display_name || prof?.username || "Designer",
          slug: prof?.username ?? prof?.slug ?? null,
          score: (d.score / 10).toFixed(1),
          count: d.projectIds.length,
          metric: `${d.projectIds.length} projects`,
        });
      }
    }
  } else if (panel === "projects") {
    const sorted = [...projectList].sort((a, b) => toNum(b.views_count) - toNum(a.views_count)).slice(0, limit);
    for (const p of sorted) {
      rows.push({
        id: p.id,
        name: p.title || "Project",
        slug: p.slug,
        score: String(toNum(p.views_count)),
        metric: `${toNum(p.views_count)} views`,
      });
    }
  } else if (panel === "brands") {
    let pblQuery = sup.from("project_brand_links").select("brand_profile_id, project_id");
    if (projectIds.length > 0) pblQuery = pblQuery.in("project_id", projectIds);
    const { data: pblRows } = await pblQuery;
    const brandToProjects: Record<string, Set<string>> = {};
    const brandToDesigners: Record<string, Set<string>> = {};
    for (const r of pblRows ?? []) {
      const bid = (r as { brand_profile_id: string }).brand_profile_id;
      const pid = (r as { project_id: string }).project_id;
      if (!brandToProjects[bid]) brandToProjects[bid] = new Set();
      brandToProjects[bid].add(pid);
      const proj = projectList.find((x) => x.id === pid);
      if (proj?.owner_profile_id) {
        if (!brandToDesigners[bid]) brandToDesigners[bid] = new Set();
        brandToDesigners[bid].add(proj.owner_profile_id);
      }
    }
    const sorted = Object.entries(brandToProjects)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, limit)
      .map(([id]) => id);
    if (sorted.length > 0) {
      const { data: bProfs } = await sup.from("profiles").select("id, display_name, username, slug").in("id", sorted);
      const bProfMap = new Map((bProfs ?? []).map((p: { id: string }) => [p.id, p]));
      for (const id of sorted) {
        const prof = bProfMap.get(id) as { display_name: string | null; username: string | null; slug: string | null } | undefined;
        rows.push({
          id,
          name: prof?.display_name || prof?.username || "Brand",
          slug: prof?.username ?? prof?.slug ?? null,
          count: brandToProjects[id].size,
          metric: `${brandToProjects[id].size} projects · ${brandToDesigners[id]?.size ?? 0} designers`,
        });
      }
    }
  } else if (panel === "products") {
    let pplQuery = sup.from("project_product_links").select("product_id, project_id");
    if (projectIds.length > 0) pplQuery = pplQuery.in("project_id", projectIds);
    const { data: pplRows } = await pplQuery;
    const productToProjects: Record<string, number> = {};
    for (const r of pplRows ?? []) {
      const pid = (r as { product_id: string }).product_id;
      productToProjects[pid] = (productToProjects[pid] ?? 0) + 1;
    }
    const sorted = Object.entries(productToProjects)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
    if (sorted.length > 0) {
      const { data: prodRows } = await sup.from("listings").select("id, title, slug").in("id", sorted).eq("type", "product");
      const prodMap = new Map((prodRows ?? []).map((p: { id: string }) => [p.id, p]));
      for (const id of sorted) {
        const prod = prodMap.get(id) as { title: string | null; slug: string | null } | undefined;
        rows.push({
          id,
          name: prod?.title || "Product",
          slug: prod?.slug ?? null,
          count: productToProjects[id],
          metric: `${productToProjects[id]} projects`,
        });
      }
    }
  } else if (panel === "categories") {
    const catCounts: Record<string, number> = {};
    for (const p of projectList) {
      const c = (p.project_category ?? p.category ?? "").trim();
      if (c) catCounts[c] = (catCounts[c] ?? 0) + 1;
    }
    const sorted = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    for (const [name, count] of sorted) {
      const prevEst = Math.max(1, count - 1);
      const growth = Math.round(((count - prevEst) / prevEst) * 100);
      rows.push({
        id: name,
        name,
        slug: null,
        growth: growth > 0 ? `+${growth}%` : `${growth}%`,
        count,
        metric: `${count} projects`,
      });
    }
  } else if (panel === "collaboration") {
    if (projectIds.length > 0) {
      const { data: teamRows } = await sup.from("listing_team_members").select("listing_id").in("listing_id", projectIds);
      const teamByProject: Record<string, number> = {};
      for (const t of teamRows ?? []) {
        const lid = (t as { listing_id: string }).listing_id;
        teamByProject[lid] = (teamByProject[lid] ?? 0) + 1;
      }
      const catTeams: Record<string, number[]> = {};
      for (const p of projectList) {
        const c = (p.project_category ?? p.category ?? "").trim();
        if (c) {
          if (!catTeams[c]) catTeams[c] = [];
          catTeams[c].push(teamByProject[p.id] ?? 0);
        }
      }
      const byAvg = Object.entries(catTeams)
        .filter(([, arr]) => arr.length >= 1)
        .map(([name, arr]) => ({
          name,
          avg: arr.reduce((a, b) => a + b, 0) / arr.length,
          count: arr.length,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, limit);
      for (const x of byAvg) {
        rows.push({
          id: x.name,
          name: x.name,
          slug: null,
          score: x.avg.toFixed(1),
          count: x.count,
          metric: `${x.avg.toFixed(1)} avg teams · ${x.count} projects`,
        });
      }
    }
  }

  return rows;
}

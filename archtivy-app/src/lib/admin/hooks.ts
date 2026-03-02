"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

const REFETCH_INTERVAL = 15_000;

async function fetchAdmin<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`[admin] ${res.status} ${text}`);
  }
  return res.json();
}

// ─── Query Keys ────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  dashboard: ["admin", "dashboard"] as const,
  profiles: (params: Record<string, string>) => ["admin", "profiles", params] as const,
  projects: (params: Record<string, string>) => ["admin", "projects", params] as const,
  products: (params: Record<string, string>) => ["admin", "products", params] as const,
  seoProjects: (filter: string) => ["admin", "seo", "projects", filter] as const,
  seoProducts: (filter: string) => ["admin", "seo", "products", filter] as const,
  seoProfiles: (filter: string) => ["admin", "seo", "profiles", filter] as const,
  featured: ["admin", "featured"] as const,
  taxonomies: ["admin", "taxonomies"] as const,
} as const;

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardData {
  profiles: { total: number; today: number; last7d: number; last30d: number };
  projects: { total: number; last7d: number };
  products: { total: number; last7d: number };
  metrics: { total_saves: number; total_connections: number };
  alerts: {
    missing_cover_image: number;
    missing_location: number;
    missing_team: number;
    low_word_count: number;
    no_matches: number;
  };
}

export function useDashboard(): UseQueryResult<DashboardData> {
  return useQuery({
    queryKey: QUERY_KEYS.dashboard,
    queryFn: () => fetchAdmin<DashboardData>("/api/admin/dashboard"),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Profiles ───────────────────────────────────────────────────────────────

export interface AdminProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  role: "designer" | "brand";
  location_city: string | null;
  avatar_url: string | null;
  claim_status: string | null;
  is_admin: boolean | null;
  listings_count: number;
  connections_count: number;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilesResponse {
  data: AdminProfile[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminProfiles(params: {
  q?: string;
  role?: string;
  page?: number;
}): UseQueryResult<ProfilesResponse> {
  const p: Record<string, string> = {};
  if (params.q) p.q = params.q;
  if (params.role) p.role = params.role;
  if (params.page) p.page = String(params.page);

  return useQuery({
    queryKey: QUERY_KEYS.profiles(p),
    queryFn: () => fetchAdmin<ProfilesResponse>("/api/admin/profiles", p),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface AdminProject {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  location_city: string | null;
  year: string | null;
  cover_image_url: string | null;
  category: string | null;
  image_count: number;
  product_count: number;
  word_count: number;
  has_team: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectsResponse {
  data: AdminProject[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminProjects(params: {
  q?: string;
  year?: string;
  city?: string;
  category?: string;
  hasProducts?: string;
  hasTeam?: string;
  missing?: string;
  page?: number;
}): UseQueryResult<ProjectsResponse> {
  const p: Record<string, string> = {};
  if (params.q) p.q = params.q;
  if (params.year) p.year = params.year;
  if (params.city) p.city = params.city;
  if (params.category) p.category = params.category;
  if (params.hasProducts) p.hasProducts = params.hasProducts;
  if (params.hasTeam) p.hasTeam = params.hasTeam;
  if (params.missing) p.missing = params.missing;
  if (params.page) p.page = String(params.page);

  return useQuery({
    queryKey: QUERY_KEYS.projects(p),
    queryFn: () => fetchAdmin<ProjectsResponse>("/api/admin/projects", p),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

export interface AdminProduct {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  category: string | null;
  product_type: string | null;
  material_or_finish: string | null;
  image_count: number;
  used_in_projects: number;
  word_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface ProductsResponse {
  data: AdminProduct[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAdminProducts(params: {
  q?: string;
  category?: string;
  productType?: string;
  neverUsed?: string;
  missing?: string;
  page?: number;
}): UseQueryResult<ProductsResponse> {
  const p: Record<string, string> = {};
  if (params.q) p.q = params.q;
  if (params.category) p.category = params.category;
  if (params.productType) p.productType = params.productType;
  if (params.neverUsed) p.neverUsed = params.neverUsed;
  if (params.missing) p.missing = params.missing;
  if (params.page) p.page = String(params.page);

  return useQuery({
    queryKey: QUERY_KEYS.products(p),
    queryFn: () => fetchAdmin<ProductsResponse>("/api/admin/products", p),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── SEO ─────────────────────────────────────────────────────────────────────

export type SeoStatus = "PASS" | "WARN" | "FAIL";

export interface SeoCheck {
  id: string;
  status: SeoStatus;
  message: string;
}

export interface SeoRow {
  id: string;
  title: string;
  slug: string | null;
  overall: SeoStatus;
  score: number;
  checks: SeoCheck[];
  edit_href: string;
  // profiles only
  display_name?: string;
  username?: string;
  role?: string;
  should_noindex?: boolean;
  listings_count?: number;
}

export interface SeoResponse {
  data: SeoRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function useSeoAudit(
  entity: "projects" | "products" | "profiles",
  filter: string
): UseQueryResult<SeoResponse> {
  return useQuery({
    queryKey:
      entity === "projects"
        ? QUERY_KEYS.seoProjects(filter)
        : entity === "products"
          ? QUERY_KEYS.seoProducts(filter)
          : QUERY_KEYS.seoProfiles(filter),
    queryFn: () =>
      fetchAdmin<SeoResponse>(`/api/admin/seo/${entity}`, filter ? { filter } : {}),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Featured ────────────────────────────────────────────────────────────────

export interface FeaturedData {
  featured: unknown[];
  featured_error: string | null;
  sponsors: unknown[];
  sponsors_error: string | null;
}

export function useFeatured(): UseQueryResult<FeaturedData> {
  return useQuery({
    queryKey: QUERY_KEYS.featured,
    queryFn: () => fetchAdmin<FeaturedData>("/api/admin/featured"),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Taxonomies ───────────────────────────────────────────────────────────────

export interface TaxonomyEntry {
  value: string;
  count: number;
}

export interface TaxonomiesData {
  categories: TaxonomyEntry[];
  productTypes: TaxonomyEntry[];
  materials: TaxonomyEntry[];
  colors: TaxonomyEntry[];
  cities: TaxonomyEntry[];
  countries: TaxonomyEntry[];
  taxonomyTree: Array<{ id: string; label: string; categoryCount: number }>;
}

export function useTaxonomies(): UseQueryResult<TaxonomiesData> {
  return useQuery({
    queryKey: QUERY_KEYS.taxonomies,
    queryFn: () => fetchAdmin<TaxonomiesData>("/api/admin/taxonomies"),
    refetchInterval: REFETCH_INTERVAL,
  });
}

// ─── Invalidation helpers ─────────────────────────────────────────────────────

export function useAdminInvalidate() {
  const qc = useQueryClient();
  return {
    invalidateDashboard: () => qc.invalidateQueries({ queryKey: ["admin", "dashboard"] }),
    invalidateProfiles: () => qc.invalidateQueries({ queryKey: ["admin", "profiles"] }),
    invalidateProjects: () => qc.invalidateQueries({ queryKey: ["admin", "projects"] }),
    invalidateProducts: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    invalidateSeo: () => qc.invalidateQueries({ queryKey: ["admin", "seo"] }),
    invalidateFeatured: () => qc.invalidateQueries({ queryKey: ["admin", "featured"] }),
    invalidateTaxonomies: () => qc.invalidateQueries({ queryKey: ["admin", "taxonomies"] }),
    invalidateAll: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  };
}

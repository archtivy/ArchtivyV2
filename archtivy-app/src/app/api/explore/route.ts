import { NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type {
  ExploreMapItem,
  ExploreMapListingItem,
  ExploreMapProfileItem,
  ExploreMapStats,
  ExploreMode,
} from "@/lib/explore-map/types";

const MAX_ITEMS = 200;
const LISTING_STATUS = "APPROVED"; // Use "published" if your DB uses that value

function escapeIlike(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Coerce unknown to number or null (handles DB integer/string). */
function toIntOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * GET /api/explore
 * Query params: mode, q, collab, minLat, minLng, maxLat, maxLng
 * Returns { items, stats } for map + cards.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") ?? "all") as ExploreMode;
  if (!["all", "projects", "designers", "brands"].includes(mode)) {
    return Response.json({ error: "Invalid mode" }, { status: 400 });
  }
  const q = searchParams.get("q")?.trim() ?? "";
  const collab = searchParams.get("collab") === "1";
  const minLat = parseFloat(searchParams.get("minLat") ?? "");
  const minLng = parseFloat(searchParams.get("minLng") ?? "");
  const maxLat = parseFloat(searchParams.get("maxLat") ?? "");
  const maxLng = parseFloat(searchParams.get("maxLng") ?? "");

  const hasBbox =
    !Number.isNaN(minLat) &&
    !Number.isNaN(minLng) &&
    !Number.isNaN(maxLat) &&
    !Number.isNaN(maxLng);

  const sup = getSupabaseServiceClient();
  const items: ExploreMapItem[] = [];
  const stats: ExploreMapStats = { projects: 0, designers: 0, brands: 0 };

  const listingSelect =
    "id, type, title, slug, cover_image_url, location_text, location_city, location_country, location_lat, location_lng, year, project_category, area_sqft, saves_count, views_count, collaboration_open, status";
  const profileSelect =
    "id, role, display_name, username, slug, cover_image_url, avatar_url, location_text, location_city, location_country, location_lat, location_lng, designer_discipline, brand_type, collaboration_open";

  if (mode === "all" || mode === "projects") {
    let listQuery = sup
      .from("listings")
      .select(listingSelect)
      .eq("type", "project")
      .eq("status", LISTING_STATUS)
      .is("deleted_at", null)
      .not("location_lat", "is", null)
      .not("location_lng", "is", null);

    if (collab) listQuery = listQuery.eq("collaboration_open", true);
    if (hasBbox) {
      listQuery = listQuery
        .gte("location_lat", minLat)
        .lte("location_lat", maxLat)
        .gte("location_lng", minLng)
        .lte("location_lng", maxLng);
    }
    if (q) {
      const pattern = `%${escapeIlike(q)}%`;
      listQuery = listQuery.ilike("title", pattern);
    }

    const { data: rows, error } = await listQuery
      .order("views_count", { ascending: false })
      .order("saves_count", { ascending: false })
      .limit(MAX_ITEMS);

    if (!error && rows?.length) {
      for (const r of rows as RawListingRow[]) {
        items.push(normalizeListingRow(r));
        stats.projects += 1;
      }
    }
  }

  if (mode === "all" || mode === "designers" || mode === "brands") {
    const roles = mode === "designers" ? ["designer"] : mode === "brands" ? ["brand"] : ["designer", "brand"];
    let profQuery = sup
      .from("profiles")
      .select(profileSelect)
      .in("role", roles)
      .eq("is_hidden", false)
      .not("location_lat", "is", null)
      .not("location_lng", "is", null);

    if (collab) profQuery = profQuery.eq("collaboration_open", true);
    if (hasBbox) {
      profQuery = profQuery
        .gte("location_lat", minLat)
        .lte("location_lat", maxLat)
        .gte("location_lng", minLng)
        .lte("location_lng", maxLng);
    }
    if (q) {
      const pattern = `%${escapeIlike(q)}%`;
      profQuery = profQuery.or(`display_name.ilike.${pattern},username.ilike.${pattern}`);
    }

    const { data: rows, error } = await profQuery.limit(MAX_ITEMS);

    if (!error && rows?.length) {
      for (const r of rows as RawProfileRow[]) {
        const role = r.role === "brand" ? "brand" : "designer";
        items.push(normalizeProfileRow(r, role));
        if (role === "designer") stats.designers += 1;
        else stats.brands += 1;
      }
    }
  }

  // Sort: projects first, then by engagement (views/saves for listings, profiles after)
  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "listing" ? -1 : 1;
    if (a.kind === "listing" && b.kind === "listing") {
      const va = (a as ExploreMapListingItem).views_count + (a as ExploreMapListingItem).saves_count;
      const vb = (b as ExploreMapListingItem).views_count + (b as ExploreMapListingItem).saves_count;
      return vb - va;
    }
    return 0;
  });

  return Response.json({ items: items.slice(0, MAX_ITEMS), stats });
}

type RawListingRow = {
  id: string;
  type: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  location_text: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: unknown;
  location_lng: unknown;
  year: unknown;
  project_category: string | null;
  area_sqft: unknown;
  saves_count?: unknown;
  views_count?: unknown;
  collaboration_open?: boolean;
  status: string | null;
};

type RawProfileRow = {
  id: string;
  role: string;
  display_name: string | null;
  username: string | null;
  slug: string | null;
  cover_image_url: string | null;
  avatar_url: string | null;
  location_text: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: unknown;
  location_lng: unknown;
  designer_discipline: string | null;
  brand_type: string | null;
  collaboration_open?: boolean;
};

function normalizeListingRow(r: RawListingRow): ExploreMapListingItem {
  const yearVal = r.year;
  const yearStr =
    yearVal == null ? null : typeof yearVal === "number" ? String(yearVal) : String(yearVal).trim() || null;
  return {
    kind: "listing",
    entity: "project",
    id: r.id,
    type: "project",
    title: r.title ?? null,
    slug: r.slug ?? null,
    cover_image_url: r.cover_image_url?.trim() ?? null,
    location_text: r.location_text?.trim() ?? null,
    location_city: r.location_city?.trim() ?? null,
    location_country: r.location_country?.trim() ?? null,
    location_lat: toIntOrNull(r.location_lat),
    location_lng: toIntOrNull(r.location_lng),
    year: yearStr,
    project_category: r.project_category?.trim() ?? null,
    area_sqft: toIntOrNull(r.area_sqft),
    saves_count: toIntOrNull(r.saves_count) ?? 0,
    views_count: toIntOrNull(r.views_count) ?? 0,
    collaboration_open: Boolean(r.collaboration_open),
    status: r.status ?? null,
  };
}

function normalizeProfileRow(r: RawProfileRow, role: "designer" | "brand"): ExploreMapProfileItem {
  return {
    kind: "profile",
    role,
    id: r.id,
    display_name: r.display_name?.trim() ?? null,
    username: r.username?.trim() ?? null,
    slug: r.slug?.trim() ?? null,
    cover_image_url: r.cover_image_url?.trim() ?? null,
    avatar_url: r.avatar_url?.trim() ?? null,
    location_text: r.location_text?.trim() ?? null,
    location_city: r.location_city?.trim() ?? null,
    location_country: r.location_country?.trim() ?? null,
    location_lat: toIntOrNull(r.location_lat),
    location_lng: toIntOrNull(r.location_lng),
    designer_discipline: r.designer_discipline?.trim() ?? null,
    brand_type: r.brand_type?.trim() ?? null,
    collaboration_open: Boolean(r.collaboration_open),
  };
}

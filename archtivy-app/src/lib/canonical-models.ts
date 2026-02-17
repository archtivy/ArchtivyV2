/**
 * Single canonical read model for projects (from listings + listing_images)
 * and products (from products + product_images). Use only these shapes in UI.
 */

import {
  type ListingImageRow,
  sanitizeListingImageUrl,
} from "@/lib/db/listingImages";
import type { ListingCardData, MaterialTag } from "@/lib/types/listings";

// Raw row from public.listings (project row)
export type RawListingRow = Record<string, unknown>;

// Raw row from public.products
export type RawProductRow = Record<string, unknown>;

// Raw row from product_images
export interface ProductImageRow {
  product_id: string;
  src: string;
  alt: string | null;
  sort_order: number;
}

export interface ProjectLocation {
  place_id?: string | null;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  text?: string | null;
}

export interface ProjectOwner {
  displayName: string;
  avatarUrl?: string | null;
  profileId?: string | null;
}

export interface ProjectCanonical {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string | null;
  year: number | null;
  area_sqft: number | null;
  area_sqm: number | null;
  location: ProjectLocation | null;
  location_text: string | null;
  cover: string | null;
  gallery: { url: string; alt: string }[];
  /** Hydrated via project_material_links -> materials. Use for sidebar/cards. */
  materials: { id: string; name: string; slug: string }[];
  material_tags: MaterialTag[];
  team_members: { name: string; role: string }[];
  documents: unknown[];
  owner_clerk_user_id: string | null;
  /** Resolved from profiles; use for card subtitle. */
  owner: ProjectOwner | null;
  /** team_members.length + brands_used.length. For "X connections" label. */
  connectionCount: number;
  created_at: string;
  updated_at: string | null;
  /** PENDING until admin approves; only APPROVED in public explore. */
  status: "PENDING" | "APPROVED";
  /** User-provided { brand_name_text, product_name_text }[]; link if match existing product. */
  mentioned_products: { brand_name_text: string; product_name_text: string }[];
}

export interface ProductCanonical {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string | null;
  material_type: string | null;
  color: string | null;
  /** Array of color names for filtering and tag suggestions. Default []. */
  color_options?: string[];
  year: number | null;
  brand_profile_id: string | null;
  team_members: unknown[];
  documents: unknown[];
  cover: string | null;
  gallery: { url: string; alt: string }[];
  owner_clerk_user_id?: string | null;
  /** Resolved from profiles; use for card subtitle (owner display name). */
  owner?: ProjectOwner | null;
  /** team_members.length + usedInProjectsCount (project_product_links). For "X connections" label. */
  connectionCount: number;
  created_at: string;
  /** Hydrated via product_material_links -> materials. Use for sidebar/cards. */
  materials: { id: string; name: string; slug: string }[];
  material_tags: MaterialTag[];
  /** PENDING until admin approves; only APPROVED in public explore. */
  status: "PENDING" | "APPROVED";
}

/** Single source of truth: project rows are listings with type = 'project'. Tolerant: type ?? listing_type. */
export function isProjectListing(listing: RawListingRow): boolean {
  const t = (listing as Record<string, unknown>)?.type ?? (listing as Record<string, unknown>)?.listing_type;
  return t === "project";
}

/** Display string for project location: "City, Country" or location_text or fallback. */
export function projectLocationDisplay(p: {
  location_city?: string | null;
  location_country?: string | null;
  location_text?: string | null;
  location?: string | null;
}): string | null {
  const city = p.location_city?.trim();
  const country = p.location_country?.trim();
  if (city && country) return `${city}, ${country}`;
  if (p.location_text?.trim()) return p.location_text.trim();
  if (p.location?.trim()) return p.location.trim();
  return null;
}

/** Safe count for jsonb array or object (e.g. team_members, brands_used). */
function safeArrayLength(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (value != null && typeof value === "object") return Object.keys(value).length;
  return 0;
}

/** Dev guard: log when raw listing row is missing canonical keys (schema mismatch). */
function devGuardListingKeys(raw: RawListingRow) {
  if (process.env.NODE_ENV !== "development") return;
  const canonicalKeys = ["location_city", "location_country", "location_text", "area_sqm", "slug"];
  const missing = canonicalKeys.filter((k) => raw[k] === undefined && (raw as Record<string, unknown>)[k] === undefined);
  if (missing.length === canonicalKeys.length) {
    console.debug("[canonical] Listing row has no canonical location/slug columns (run docs/canonical-fields-migration.sql if needed)");
  }
}

/** Normalize raw listing (project) + listing_images to ProjectCanonical. Gallery from listing_images only. */
export function normalizeProject(
  raw: RawListingRow,
  listingImages: ListingImageRow[],
  materialTags: MaterialTag[] = []
): ProjectCanonical {
  devGuardListingKeys(raw);
  const sorted = [...listingImages].sort((a, b) => a.sort_order - b.sort_order);
  const gallery = sorted
    .map((img) => ({
      url: sanitizeListingImageUrl(img.image_url),
      alt: img.alt?.trim() || "",
    }))
    .filter((g): g is { url: string; alt: string } => g.url != null);
  const cover =
    sanitizeListingImageUrl(raw.cover_image_url as string | null | undefined) ||
    gallery[0]?.url ||
    null;

  const category =
    (raw.category as string | null | undefined)?.trim() ||
    (raw.project_category as string | null | undefined)?.trim() ||
    null;
  const yearRaw = raw.year;
  const year =
    typeof yearRaw === "number" && !Number.isNaN(yearRaw)
      ? yearRaw
      : typeof yearRaw === "string" && yearRaw?.trim()
        ? parseInt(yearRaw.trim(), 10)
        : null;
  const yearNum = year != null && !Number.isNaN(year) ? year : null;

  const location_text =
    (raw.location_text as string | null | undefined)?.trim() ||
    projectLocationDisplay({
      location_city: raw.location_city as string | null,
      location_country: raw.location_country as string | null,
      location_text: raw.location_text as string | null,
      location: raw.location as string | null,
    }) ||
    (raw.location as string | null | undefined)?.trim() ||
    null;

  const location: ProjectLocation | null =
    (raw.location_city as string) || (raw.location_country as string)
      ? {
          place_id: (raw.location_place_id as string | null) ?? null,
          city: (raw.location_city as string | null) ?? null,
          country: (raw.location_country as string | null) ?? null,
          country_code: (raw.location_country_code as string | null) ?? null,
          lat: (raw.location_lat as number | null) ?? null,
          lng: (raw.location_lng as number | null) ?? null,
          text: (raw.location_text as string | null) ?? null,
        }
      : null;

  const team_members = Array.isArray(raw.team_members)
    ? (raw.team_members as { name?: string; role?: string }[]).filter(
        (m) => m && typeof m === "object" && typeof (m as { name?: string }).name === "string"
      ).map((m) => ({
        name: (m as { name: string }).name?.trim() || "",
        role: (m as { role?: string }).role?.trim() || "",
      }))
    : [];

  const teamMembersCount = safeArrayLength(raw.team_members);
  const brandsUsedCount = safeArrayLength(raw.brands_used);
  const connectionCount = teamMembersCount + brandsUsedCount;

  return {
    id: String(raw.id),
    slug: (raw.slug as string | null) ?? null,
    title: (raw.title as string)?.trim() || "",
    description: (raw.description as string | null)?.trim() ?? null,
    category,
    year: yearNum,
    area_sqft:
      typeof raw.area_sqft === "number" && !Number.isNaN(raw.area_sqft)
        ? raw.area_sqft
        : null,
    area_sqm:
      typeof raw.area_sqm === "number" && !Number.isNaN(raw.area_sqm)
        ? raw.area_sqm
        : null,
    location,
    location_text,
    cover,
    gallery,
    materials: materialTags.map((m) => ({ id: m.id, name: m.display_name, slug: m.slug })),
    material_tags: materialTags,
    team_members,
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    owner_clerk_user_id: (raw.owner_clerk_user_id as string | null) ?? null,
    owner: null,
    connectionCount,
    created_at: String(raw.created_at ?? ""),
    updated_at: (raw.updated_at as string | null) ?? null,
  };
}

/** Normalize raw product + product_images to ProductCanonical. Gallery from product_images only. */
export function normalizeProduct(
  raw: RawProductRow,
  productImages: ProductImageRow[],
  materialTags: MaterialTag[] = []
): ProductCanonical {
  const sorted = [...productImages].sort((a, b) => a.sort_order - b.sort_order);
  const gallery = sorted
    .map((img) => ({
      url: sanitizeListingImageUrl(img.src),
      alt: img.alt?.trim() || "",
    }))
    .filter((g): g is { url: string; alt: string } => g.url != null);
  const cover =
    sanitizeListingImageUrl(raw.cover_image_url as string | null | undefined) ||
    gallery[0]?.url ||
    null;

  const yearRaw = raw.year;
  const year =
    typeof yearRaw === "number" && !Number.isNaN(yearRaw)
      ? yearRaw
      : typeof yearRaw === "string" && yearRaw != null
        ? parseInt(String(yearRaw).trim(), 10)
        : null;
  const yearNum = year != null && !Number.isNaN(year) ? year : null;

  const teamMembersCount = safeArrayLength(raw.team_members);
  const connectionCount = teamMembersCount; // usedInProjectsCount added in explore layer

  return {
    id: String(raw.id),
    slug: (raw.slug as string | null) ?? null,
    title: (raw.title as string)?.trim() || "",
    description:
      (raw.description as string | null)?.trim() ??
      (raw.subtitle as string | null)?.trim() ??
      null,
    category: (raw.category as string | null)?.trim() ?? null,
    material_type: (raw.material_type as string | null)?.trim() ?? null,
    color: (raw.color as string | null)?.trim() ?? null,
    year: yearNum,
    brand_profile_id: (raw.brand_profile_id as string | null) ?? null,
    team_members: Array.isArray(raw.team_members) ? raw.team_members : [],
    documents: Array.isArray(raw.documents) ? raw.documents : [],
    cover,
    gallery,
    owner_clerk_user_id: (raw.owner_clerk_user_id as string | null) ?? null,
    connectionCount,
    created_at: String(raw.created_at ?? ""),
    materials: materialTags.map((m) => ({ id: m.id, name: m.display_name, slug: m.slug })),
    material_tags: materialTags,
    status: (raw.status as "PENDING" | "APPROVED") ?? "APPROVED",
  };
}

/** Display string for project meta row: category • year • area_sqft */
export function projectMetaDisplay(p: ProjectCanonical): string[] {
  const parts: string[] = [];
  if (p.category?.trim()) parts.push(p.category.trim());
  if (p.year != null && !Number.isNaN(p.year)) parts.push(String(p.year));
  if (p.area_sqft != null && !Number.isNaN(p.area_sqft)) {
    parts.push(`${Math.round(p.area_sqft)} sqft`);
  }
  return parts;
}

/** Display string for product meta row: category • material_type (optional + color) */
export function productMetaDisplay(p: ProductCanonical): string[] {
  const parts: string[] = [];
  if (p.category?.trim()) parts.push(p.category.trim());
  if (p.material_type?.trim()) parts.push(p.material_type.trim());
  if (p.color?.trim()) parts.push(p.color.trim());
  return parts;
}

/** Build ListingCardData from ProjectCanonical for use in ProjectCard. */
export function projectCanonicalToCardData(
  p: ProjectCanonical
): import("@/lib/types/listings").ListingCardData {
  return {
    id: p.id,
    type: "project",
    title: p.title,
    description: p.description,
    location: p.location_text,
    created_at: p.created_at,
    owner_clerk_user_id: p.owner_clerk_user_id,
    owner_profile_id: p.owner?.profileId ?? null,
    cover_image_url: p.cover,
    category: p.category,
    area_sqft: p.area_sqft,
    year: p.year != null ? String(p.year) : null,
    product_type: null,
    product_category: null,
    product_subcategory: null,
    feature_highlight: null,
    material_or_finish: null,
    dimensions: null,
    team_members: p.team_members,
    brands_used: [],
    materials: p.materials.map((m) => ({ id: m.id, display_name: m.name, slug: m.slug })),
    views_count: 0,
    saves_count: 0,
    connection_count: p.connectionCount,
    updated_at: p.updated_at,
  };
}

/** Build ListingCardData from ProductCanonical for use in ProductCard. */
export function productCanonicalToCardData(p: ProductCanonical): ListingCardData {
  return {
    id: p.id,
    type: "product",
    title: p.title,
    description: p.description,
    location: null,
    created_at: p.created_at,
    owner_clerk_user_id: p.owner_clerk_user_id ?? null,
    owner_profile_id: p.brand_profile_id ?? null,
    cover_image_url: p.cover,
    category: p.category,
    area_sqft: null,
    year: p.year != null ? String(p.year) : null,
    product_type: p.material_type,
    product_category: null,
    product_subcategory: null,
    feature_highlight: p.color,
    material_or_finish: p.material_type,
    dimensions: null,
    team_members: [],
    brands_used: [],
    materials: p.materials.map((m) => ({ id: m.id, display_name: m.name, slug: m.slug })),
    views_count: 0,
    saves_count: 0,
    connection_count: p.connectionCount,
    updated_at: null,
  };
}

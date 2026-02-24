import { supabase } from "@/lib/supabaseClient";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { listingCardSelect, listingDetailSelect } from "@/lib/db/selects";
import type {
  CreateListingInput,
  CreateListingLocation,
  Listing,
  ListingCardData,
  ListingDetail,
  ListingSummary,
  ListingType,
  TeamMember,
  BrandUsed,
} from "@/lib/types/listings";

const LISTINGS = "listings";
const LISTING_STATUS_APPROVED = "APPROVED";

export type DbResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

/** Normalize raw row to card contract: arrays and counts never null. Tolerant: type = row.type ?? row.listing_type. */
function normalizeListingCardRow(row: Record<string, unknown>): ListingCardData {
  return {
    ...row,
    type: (row.type ?? row.listing_type) as ListingType,
    team_members: Array.isArray(row.team_members)
      ? (row.team_members as TeamMember[])
      : [],
    brands_used: Array.isArray(row.brands_used)
      ? (row.brands_used as BrandUsed[])
      : [],
    views_count:
      typeof row.views_count === "number" && !Number.isNaN(row.views_count)
        ? row.views_count
        : 0,
    saves_count:
      typeof row.saves_count === "number" && !Number.isNaN(row.saves_count)
        ? row.saves_count
        : 0,
    updated_at:
      typeof row.updated_at === "string" && row.updated_at
        ? row.updated_at
        : null,
  } as ListingCardData;
}

/** Tolerant: type = row.type ?? row.listing_type. */
function parseListingRow(row: Record<string, unknown>): Listing {
  return {
    ...row,
    type: (row.type ?? row.listing_type) as ListingType,
    team_members: Array.isArray(row.team_members) ? row.team_members : [],
    brands_used: Array.isArray(row.brands_used) ? row.brands_used : [],
  } as Listing;
}

/** Normalize raw row for detail page: arrays + counts. */
function normalizeListingDetailRow(row: Record<string, unknown>): ListingDetail {
  const base = parseListingRow(row) as ListingDetail;
  base.views_count =
    typeof row.views_count === "number" && !Number.isNaN(row.views_count) ? row.views_count : 0;
  base.saves_count =
    typeof row.saves_count === "number" && !Number.isNaN(row.saves_count) ? row.saves_count : 0;
  return base;
}

/**
 * Fetch listings by type, newest first. Returns only approved, non-deleted (public-safe).
 */
export async function getListingsByType(
  type: ListingType
): Promise<DbResult<ListingSummary[]>> {
  const { data, error } = await supabase
    .from(LISTINGS)
    .select(listingCardSelect)
    .eq("type", type)
    .eq("status", LISTING_STATUS_APPROVED)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * Fetch featured listings by type, newest first, with limit (e.g. for homepage). Approved, non-deleted only.
 */
export async function getFeaturedListings(
  type: ListingType,
  limit: number
): Promise<DbResult<ListingSummary[]>> {
  const { data, error } = await supabase
    .from(LISTINGS)
    .select(listingCardSelect)
    .eq("type", type)
    .eq("status", LISTING_STATUS_APPROVED)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * Fetch multiple listings by ids (order not guaranteed).
 */
export async function getListingsByIds(
  ids: string[]
): Promise<DbResult<ListingSummary[]>> {
  if (ids.length === 0) {
    return { data: [], error: null };
  }
  const { data, error } = await supabase
    .from(LISTINGS)
    .select(listingCardSelect)
    .in("id", ids);

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * Fetch listing slug by id (for revalidation paths). Returns slug or null.
 */
export async function getListingSlugById(id: string): Promise<string | null> {
  const { data, error } = await getSupabaseServiceClient()
    .from(LISTINGS)
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const slug = (data as { slug?: string | null }).slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : null;
}

/**
 * Fetch a single listing by id (detail view). Returns normalized ListingDetail.
 */
export async function getListingById(id: string): Promise<DbResult<ListingDetail | null>> {
  const { data, error } = await supabase
    .from(LISTINGS)
    .select(listingDetailSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) return { data: null, error: null };
  return { data: normalizeListingDetailRow(data as Record<string, unknown>), error: null };
}

/** Map CreateListingInput.location (string or object) to DB location columns. */
function mapLocationToDb(loc: CreateListingInput["location"]): {
  location: string | null;
  location_text: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_place_id: string | null;
  location_country_code: string | null;
} {
  if (loc == null) {
    return {
      location: null,
      location_text: null,
      location_city: null,
      location_country: null,
      location_lat: null,
      location_lng: null,
      location_place_id: null,
      location_country_code: null,
    };
  }
  if (typeof loc === "string") {
    const t = loc.trim() || null;
    return {
      location: t,
      location_text: t,
      location_city: null,
      location_country: null,
      location_lat: null,
      location_lng: null,
      location_place_id: null,
      location_country_code: null,
    };
  }
  const o = loc as CreateListingLocation;
  const text =
    (o.location_text?.trim() ?? null) ||
    [o.location_city, o.location_country].filter(Boolean).join(", ") ||
    null;
  const lat =
    o.location_lat != null && typeof o.location_lat === "number" && !Number.isNaN(o.location_lat)
      ? o.location_lat
      : null;
  const lng =
    o.location_lng != null && typeof o.location_lng === "number" && !Number.isNaN(o.location_lng)
      ? o.location_lng
      : null;
  return {
    location: text,
    location_text: text ?? null,
    location_city: (o.location_city?.trim() ?? null) || null,
    location_country: (o.location_country?.trim() ?? null) || null,
    location_lat: lat,
    location_lng: lng,
    location_place_id: (o.location_place_id?.trim() ?? null) || null,
    location_country_code: (o.location_country_code?.trim() ?? null) || null,
  };
}

/**
 * Create a listing. Returns the new listing id on success.
 * Inserts with status APPROVED, deleted_at null, views_count/saves_count 0 so rows satisfy Explore filters.
 */
export async function createListing(
  input: CreateListingInput
): Promise<DbResult<{ id: string }>> {
  const loc = mapLocationToDb(input.location);
  const row: Record<string, unknown> = {
    type: input.type,
    listing_type: input.type,
    status: LISTING_STATUS_APPROVED,
    deleted_at: null,
    views_count: 0,
    saves_count: 0,
    title: input.title.trim(),
    description: (input.description?.trim() ?? null) || null,
    owner_clerk_user_id: input.owner_clerk_user_id ?? null,
    owner_profile_id: input.owner_profile_id ?? null,
    cover_image_url: input.cover_image_url ?? null,
    category: input.category ?? null,
    area_sqft: input.area_sqft ?? null,
    year: input.year ?? null,
    product_type: input.product_type ?? null,
    product_category: input.product_category ?? null,
    product_subcategory: input.product_subcategory ?? null,
    feature_highlight: input.feature_highlight ?? null,
    material_or_finish: input.material_or_finish ?? null,
    dimensions: input.dimensions ?? null,
    team_members: input.team_members ?? [],
    brands_used: input.brands_used ?? [],
    ...loc,
  };
  if (input.slug?.trim()) row.slug = input.slug.trim();
  if (input.type === "project") {
    row.project_category = input.category ?? null;
  }

  const { data, error } = await supabase
    .from(LISTINGS)
    .insert(row)
    .select("id, type")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }
  const out = data as { id: string; type: string | null } | null;
  if (!out?.id) {
    return { data: null, error: "No id returned from insert" };
  }
  if (!out.type) {
    return { data: null, error: "Listing created but type is missing (data integrity)." };
  }
  return { data: { id: out.id }, error: null };
}

/**
 * Fetch listings owned by a Clerk user (owner_clerk_user_id only).
 * Use for dashboard "My listings" when combined with owner_profile_id for user's profile.
 * Does NOT include listing_team_members (tagged) — ownership only.
 */
export async function getListingsByOwner(
  ownerClerkUserId: string
): Promise<DbResult<ListingSummary[]>> {
  const { data, error } = await supabase
    .from(LISTINGS)
    .select(listingCardSelect)
    .eq("owner_clerk_user_id", ownerClerkUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }
  const rows = (data ?? []).map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * Fetch listings owned by the current user for dashboard: owner_clerk_user_id = userId
 * OR owner_profile_id = profileId (admin-assigned to user's profile).
 * Does NOT include listing_team_members (tagged) — ownership only.
 */
export async function getOwnedListingsForClerkUser(
  clerkUserId: string,
  profileId: string | null
): Promise<DbResult<ListingSummary[]>> {
  const [byClerk, byProfile] = await Promise.all([
    supabase
      .from(LISTINGS)
      .select(listingCardSelect)
      .eq("owner_clerk_user_id", clerkUserId)
      .order("created_at", { ascending: false }),
    profileId
      ? supabase
          .from(LISTINGS)
          .select(listingCardSelect)
          .eq("owner_profile_id", profileId)
          .order("created_at", { ascending: false })
      : { data: [] as unknown[], error: null },
  ]);
  if (byClerk.error) return { data: null, error: byClerk.error.message };
  if (byProfile.error) return { data: null, error: byProfile.error.message };
  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const row of [...(byClerk.data ?? []), ...(byProfile.data ?? [])]) {
    const id = (row as { id: string }).id;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(row as Record<string, unknown>);
  }
  merged.sort((a, b) => {
    const aAt = (a.created_at as string) ?? "";
    const bAt = (b.created_at as string) ?? "";
    return bAt.localeCompare(aAt);
  });
  const rows = merged.map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * Owned listings for a profile: owner_profile_id = profileId OR owner_clerk_user_id in ownerClerkUserIds.
 * Use for public profile "Published" / "Listings". Does NOT include listing_team_members (tagged).
 */
export async function getOwnedListingsForProfile(
  profileId: string,
  ownerClerkUserIds: string[]
): Promise<DbResult<ListingSummary[]>> {
  const clerkIds = ownerClerkUserIds.filter(Boolean);
  const [byProfile, byClerk] = await Promise.all([
    supabase
      .from(LISTINGS)
      .select(listingCardSelect)
      .eq("owner_profile_id", profileId)
      .order("created_at", { ascending: false }),
    clerkIds.length > 0
      ? supabase
          .from(LISTINGS)
          .select(listingCardSelect)
          .in("owner_clerk_user_id", clerkIds)
          .order("created_at", { ascending: false })
      : { data: [] as unknown[], error: null },
  ]);

  if (byProfile.error) return { data: null, error: byProfile.error.message };
  if (byClerk.error) return { data: null, error: byClerk.error.message };

  const seen = new Set<string>();
  const merged: Record<string, unknown>[] = [];
  for (const row of [...(byProfile.data ?? []), ...(byClerk.data ?? [])]) {
    const id = (row as { id: string }).id;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(row as Record<string, unknown>);
  }
  merged.sort((a, b) => {
    const aAt = (a.created_at as string) ?? "";
    const bAt = (b.created_at as string) ?? "";
    return bAt.localeCompare(aAt);
  });
  const rows = merged.map((r) => normalizeListingCardRow(r as Record<string, unknown>));
  return { data: rows, error: null };
}

/**
 * @deprecated Use getOwnedListingsForProfile for clarity. Same behavior: ownership only, no listing_team_members.
 */
export async function getListingsForProfile(
  profileId: string,
  ownerClerkUserIds: string[]
): Promise<DbResult<ListingSummary[]>> {
  return getOwnedListingsForProfile(profileId, ownerClerkUserIds);
}

/**
 * Create or replace listing row for a product (shared PK: listings.id === products.id).
 * Call after inserting into products so /products/[slug] resolves.
 */
export async function upsertListingForProduct(
  productId: string,
  payload: {
    slug: string;
    title: string;
    description: string | null;
    owner_clerk_user_id: string | null;
    owner_profile_id: string | null;
    /** PENDING for new user submissions; APPROVED for backfill. */
    status?: "PENDING" | "APPROVED";
    /** Product taxonomy (PRODUCT_TAXONOMY ids/slugs). */
    product_type?: string | null;
    product_category?: string | null;
    product_subcategory?: string | null;
  }
): Promise<DbResult<void>> {
  const client = getSupabaseServiceClient();
  const row = {
    id: productId,
    type: "product" as const,
    listing_type: "product" as const,
    status: payload.status ?? "APPROVED",
    slug: payload.slug,
    title: payload.title.trim(),
    description: (payload.description?.trim() ?? null) || null,
    owner_clerk_user_id: payload.owner_clerk_user_id ?? null,
    owner_profile_id: payload.owner_profile_id ?? null,
    cover_image_url: null,
    location: null,
    category: null,
    area_sqft: null,
    year: null,
    product_type: payload.product_type ?? null,
    product_category: payload.product_category ?? null,
    product_subcategory: payload.product_subcategory ?? null,
    feature_highlight: null,
    material_or_finish: null,
    dimensions: null,
    team_members: [],
    brands_used: [],
    deleted_at: null,
  };
  const { error } = await client.from(LISTINGS).upsert(row, { onConflict: "id" });
  if (error) {
    return { data: null, error: error.message };
  }
  const check = await client.from(LISTINGS).select("type").eq("id", productId).maybeSingle();
  if (check.error || !check.data?.type) {
    return { data: null, error: "Listing created but type is missing (data integrity)." };
  }
  return { data: undefined, error: null };
}

/**
 * Update listing cover image URL (after first gallery image is uploaded).
 */
export async function updateListingCoverImage(
  id: string,
  coverImageUrl: string
): Promise<DbResult<void>> {
  const { error } = await supabase
    .from(LISTINGS)
    .update({ cover_image_url: coverImageUrl })
    .eq("id", id);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: undefined, error: null };
}

/**
 * Delete a listing by id (for rollback on failed image upload).
 */
export async function deleteListing(id: string): Promise<DbResult<void>> {
  const { error } = await supabase.from(LISTINGS).delete().eq("id", id);
  if (error) {
    return { data: null, error: error.message };
  }
  return { data: undefined, error: null };
}

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
 * Return `baseSlug`, or the first `baseSlug-N` not already taken in `listings`.
 *
 * `listings` is the table that owns the public URL space — /products/[...segments]
 * and /projects/[...segments] both resolve against it, as does sitemap.ts. Slug
 * uniqueness must therefore be established here, not against the `products`
 * sidecar (which lib/db/gallery.ts:ensureUniqueSlug checked, allowing a slug
 * unique in `products` to collide with a live listing).
 *
 * This narrows the window but does not close it: two concurrent submissions can
 * both pass the check. The partial unique index idx_listings_slug_unique and the
 * guard inside create_product_with_sidecar() are the actual enforcement.
 */
export async function ensureUniqueListingSlug(baseSlug: string): Promise<string> {
  const sup = getSupabaseServiceClient();
  let slug = baseSlug;
  let n = 1;
  for (;;) {
    const { data } = await sup
      .from(LISTINGS)
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();
    if (!data) return slug;
    slug = `${baseSlug}-${++n}`;
  }
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
    project_status: input.project_status ?? null,
    product_stage: input.product_stage ?? null,
    project_collaboration_status: input.project_collaboration_status ?? null,
    project_looking_for: input.project_looking_for ?? [],
    product_collaboration_status: input.product_collaboration_status ?? null,
    product_looking_for: input.product_looking_for ?? [],
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
/** The owner's own listings carry `status` so DRAFT can be told from published. */
export type OwnedListingSummary = ListingSummary & { status: string | null };

export async function getOwnedListingsForClerkUser(
  clerkUserId: string,
  profileId: string | null
): Promise<DbResult<OwnedListingSummary[]>> {
  // deleted_at IS NULL on both halves. Without it /me/listings showed rows the
  // user had already deleted — 37 listings are soft-deleted platform-wide, 13
  // of them with an owner_clerk_user_id — so Delete looked like it did nothing
  // and the row came back on every refresh.
  //
  // Status is deliberately NOT filtered here: this is the owner's own view and
  // it must include DRAFT, which is exactly what the Drafts tab is for. Public
  // surfaces filter status themselves.
  // `status` is appended because listingCardSelect omits it — it exists for
  // public card fetches, which are already filtered to APPROVED and so never
  // need the column. The owner's own list is the one place that must
  // distinguish DRAFT from published, and without this the Drafts filter would
  // silently match nothing while every row fell through to "Published".
  const ownedSelect = `${listingCardSelect}, status`;
  const [byClerk, byProfile] = await Promise.all([
    supabase
      .from(LISTINGS)
      .select(ownedSelect)
      .eq("owner_clerk_user_id", clerkUserId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    profileId
      ? supabase
          .from(LISTINGS)
          .select(ownedSelect)
          .eq("owner_profile_id", profileId)
          .is("deleted_at", null)
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
  // normalizeListingCardRow drops unknown keys, so status is re-attached from
  // the raw row rather than being silently lost between query and caller.
  const rows = merged.map((r) => ({
    ...normalizeListingCardRow(r as Record<string, unknown>),
    status: (r as { status?: string | null }).status ?? null,
  }));
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

/*
 * ── REMOVED: upsertListingForProduct ────────────────────────────────────────
 *
 * It built a listings row for a product id with `status: payload.status ??
 * "APPROVED"` and both owner columns nullable, and its only caller was the
 * /products/[slug] backfill, which passed null for both. So its sole effect in
 * practice was to publish an ownerless listing from an orphaned sidecar row.
 *
 * Products are created by the create_product_with_sidecar RPC, which writes the
 * listings row and the products row in one transaction with a real owner and an
 * explicit PENDING/DRAFT status. Nothing needs this function, and leaving a
 * ready-made "publish a listing with no owner" helper in the file is how the
 * same leak gets reintroduced by the next caller who finds it.
 */

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

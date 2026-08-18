import {
  createNotification,
  createGroupedNotification,
} from "@/lib/db/notifications";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { DetectedOpportunity } from "@/lib/lifecycle";

/**
 * Notify a profile that someone followed them.
 */
export async function notifyNewFollower(
  followerProfileId: string,
  followedProfileId: string
): Promise<void> {
  // Fetch follower name for the notification body
  const sup = getSupabaseServiceClient();
  const { data: follower } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", followerProfileId)
    .maybeSingle();

  const name =
    (follower as { display_name: string | null; username: string | null } | null)
      ?.display_name?.trim() ||
    (follower as { display_name: string | null; username: string | null } | null)
      ?.username ||
    "Someone";

  const username = (follower as { username: string | null } | null)?.username;
  const ctaUrl = username ? `/u/${username}` : `/u/id/${followerProfileId}`;

  await createNotification({
    recipient_profile_id: followedProfileId,
    actor_profile_id: followerProfileId,
    source: "follow_event",
    event_type: "new_follower",
    entity_type: "profile",
    entity_id: followerProfileId,
    title: "New follower",
    body: `${name} started following you.`,
    cta_label: "View profile",
    cta_url: ctaUrl,
  });
}

/**
 * Notify followers of a designer that they published a new project.
 */
export async function notifyDesignerPublishedProject(
  designerProfileId: string,
  projectId: string,
  projectTitle: string,
  projectSlug: string
): Promise<void> {
  const sup = getSupabaseServiceClient();

  // Get designer name
  const { data: designer } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", designerProfileId)
    .maybeSingle();

  const name =
    (designer as { display_name: string | null } | null)?.display_name?.trim() ||
    "A designer";

  // Get all followers of this designer
  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "designer")
    .eq("target_id", designerProfileId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: designerProfileId,
      source: "follow_event",
      event_type: "designer_published_project",
      entity_type: "project",
      entity_id: projectId,
      title: "New project published",
      body: `${name} published a new project: ${projectTitle}`,
      cta_label: "View project",
      cta_url: `/projects/${projectSlug}`,
      group_key: `designer_published:${designerProfileId}:${hourKey}`,
    });
  }
}

/**
 * Notify followers of a brand that they published a new product.
 */
export async function notifyBrandPublishedProduct(
  brandProfileId: string,
  productId: string,
  productTitle: string,
  productSlug: string
): Promise<void> {
  const sup = getSupabaseServiceClient();

  const { data: brand } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", brandProfileId)
    .maybeSingle();

  const name =
    (brand as { display_name: string | null } | null)?.display_name?.trim() ||
    "A brand";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "brand")
    .eq("target_id", brandProfileId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: brandProfileId,
      source: "follow_event",
      event_type: "brand_published_product",
      entity_type: "product",
      entity_id: productId,
      title: "New product added",
      body: `${name} added a new product: ${productTitle}`,
      cta_label: "View product",
      cta_url: `/products/${productSlug}`,
      group_key: `brand_published:${brandProfileId}:${hourKey}`,
    });
  }
}

/**
 * Notify followers of a category when a new listing is published in it.
 */
export async function notifyFollowedCategoryNewListing(
  categoryNodeId: string,
  listingId: string,
  listingTitle: string,
  listingSlug: string,
  listingType: "project" | "product"
): Promise<void> {
  const sup = getSupabaseServiceClient();

  // Get category label
  const { data: node } = await sup
    .from("taxonomy_nodes")
    .select("label")
    .eq("id", categoryNodeId)
    .maybeSingle();

  const categoryLabel =
    (node as { label: string } | null)?.label || "a followed category";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "category")
    .eq("target_id", categoryNodeId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);
  const prefix = listingType === "project" ? "projects" : "products";

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: null,
      source: "follow_event",
      event_type: "followed_category_new_listing",
      entity_type: listingType,
      entity_id: listingId,
      title: `New ${listingType} in ${categoryLabel}`,
      body: `${listingTitle} was published in ${categoryLabel}.`,
      cta_label: `View ${listingType}`,
      cta_url: `/${prefix}/${listingSlug}`,
      group_key: `category_listing:${categoryNodeId}:${hourKey}`,
    });
  }
}

/** Default radius for "nearby". Roughly a metropolitan commute. */
export const NEARBY_RADIUS_KM = 100;

/**
 * Great-circle distance in kilometres.
 *
 * Computed in JS rather than SQL because PostGIS is not installed and
 * profiles.location_lat/lng are plain numerics — there is no geography column
 * and no spatial index to query against. The candidate set is bounded by a
 * coarse bounding box first, so this only ever runs over a small array.
 */
function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Notify nearby profiles when a listing creates an opportunity.
 *
 * ── REWRITTEN 2026-08-16 ────────────────────────────────────────────────────
 * Previously matched with `location_city.ilike.<city>` OR
 * `location_country.ilike.<country>`. Two problems with that:
 *
 *   1. The country clause made "nearby" mean anywhere in the same country. A
 *      listing in São Paulo notified profiles 2,000km away in Belém, described
 *      as an opportunity near them.
 *   2. The city value was interpolated straight into a PostgREST `or` filter,
 *      so a city containing a comma or parenthesis would corrupt the
 *      expression rather than fail loudly.
 *
 * Now uses the real coordinates. profiles carries location_lat/location_lng
 * (populated — verified against live data), so distance is measurable instead
 * of inferred from a string match.
 *
 * ── CONSENT ─────────────────────────────────────────────────────────────────
 * Gated on location_visibility = 'public'. A profile that has not made its
 * location public must never be selected BECAUSE of that location, even though
 * the service-role client can read it. This filter is load-bearing, not
 * defensive: the service role bypasses RLS.
 *
 * Fire-and-forget — caller should not await.
 */
export async function notifyNearbyUsersOfOpportunity(input: {
  listingId: string;
  listingSlug: string;
  listingType: "project" | "product";
  listingTitle: string;
  /** Listing coordinates. Both required — without them there is no "near". */
  locationLat: number | null;
  locationLng: number | null;
  ownerProfileId: string | null;
  opportunity: DetectedOpportunity;
  radiusKm?: number;
}): Promise<void> {
  const {
    listingId,
    listingSlug,
    listingType,
    listingTitle,
    locationLat,
    locationLng,
    ownerProfileId,
    opportunity,
    radiusKm = NEARBY_RADIUS_KM,
  } = input;

  // No coordinates, no notification. Falling back to city/country text would
  // reintroduce exactly the imprecision this rewrite removes.
  if (locationLat == null || locationLng == null) return;

  const sup = getSupabaseServiceClient();

  const targetRoles =
    listingType === "product" ? ["brand", "designer"] : ["designer", "brand"];

  // Coarse bounding box, so the database does the bulk of the exclusion and
  // only plausible candidates are pulled into memory for the exact distance.
  // Longitude degrees shrink with latitude, hence the cos() term; clamped so
  // the divisor cannot approach zero near the poles.
  const latDelta = radiusKm / 111;
  const lngDelta =
    radiusKm / Math.max(1, 111 * Math.cos((locationLat * Math.PI) / 180));

  const { data: profiles, error } = await sup
    .from("profiles")
    .select("id, location_lat, location_lng")
    .in("role", targetRoles)
    .eq("location_visibility", "public")
    .is("deleted_at", null)
    .not("location_lat", "is", null)
    .not("location_lng", "is", null)
    .gte("location_lat", locationLat - latDelta)
    .lte("location_lat", locationLat + latDelta)
    .gte("location_lng", locationLng - lngDelta)
    .lte("location_lng", locationLng + lngDelta)
    .limit(500);

  if (error) {
    console.error("[notifyNearbyUsersOfOpportunity] query failed:", error.message);
    return;
  }
  if (!profiles || profiles.length === 0) return;

  const prefix = listingType === "project" ? "projects" : "products";
  const ctaUrl = `/${prefix}/${listingSlug}`;
  const dayKey = new Date().toISOString().slice(0, 10);

  for (const profile of profiles) {
    const p = profile as {
      id: string;
      location_lat: number | null;
      location_lng: number | null;
    };
    if (p.id === ownerProfileId) continue;
    if (p.location_lat == null || p.location_lng == null) continue;

    // The bounding box is a square; this makes the radius an actual circle.
    const km = haversineKm(locationLat, locationLng, p.location_lat, p.location_lng);
    if (km > radiusKm) continue;

    await createGroupedNotification({
      recipient_profile_id: p.id,
      actor_profile_id: ownerProfileId,
      source: "system",
      event_type: "opportunity_nearby",
      entity_type: listingType,
      entity_id: listingId,
      title: opportunity.label,
      body: `${opportunity.description}: ${listingTitle}`,
      cta_label: `View ${listingType}`,
      cta_url: ctaUrl,
      group_key: `opportunity:${listingId}:${dayKey}`,
    });
  }
}

/**
 * Notify followers of a material when a new listing uses it.
 */
export async function notifyFollowedMaterialNewListing(
  materialNodeId: string,
  listingId: string,
  listingTitle: string,
  listingSlug: string,
  listingType: "project" | "product"
): Promise<void> {
  const sup = getSupabaseServiceClient();

  const { data: node } = await sup
    .from("taxonomy_nodes")
    .select("label")
    .eq("id", materialNodeId)
    .maybeSingle();

  const materialLabel =
    (node as { label: string } | null)?.label || "a followed material";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "material")
    .eq("target_id", materialNodeId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);
  const prefix = listingType === "project" ? "projects" : "products";

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: null,
      source: "follow_event",
      event_type: "followed_material_new_listing",
      entity_type: listingType,
      entity_id: listingId,
      title: `A followed material appears in a new ${listingType}`,
      body: `${listingTitle} features ${materialLabel}.`,
      cta_label: `View ${listingType}`,
      cta_url: `/${prefix}/${listingSlug}`,
      group_key: `material_listing:${materialNodeId}:${hourKey}`,
    });
  }
}

/**
 * Single source of truth for listing select strings.
 * Use listingCardSelect for all card-rendering fetches (home, explore, related sections).
 * Add views_count, saves_count to the select when DB columns exist (default 0 until then).
 */

/** Columns needed for listing cards. Select type (NOT NULL); normalizers use type ?? listing_type. */
export const listingCardSelect =
  "id, type, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, location, category, area_sqft, year, product_type, product_category, product_subcategory, feature_highlight, material_or_finish, dimensions, team_members, brands_used";

/**
 * Canonical project listing select: all fields needed for ProjectCanonical.
 */
export const projectListingSelect =
  "id, type, slug, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, location, location_place_id, location_city, location_country, location_country_code, location_lat, location_lng, location_text, area_sqft, area_sqm, year, category, project_category, material_or_finish, team_members, brands_used, status, mentioned_products";

/**
 * Columns for product listings (listings.type = 'product').
 */
export const productListingSelect =
  "id, type, slug, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, category, year, product_type, product_category, product_subcategory, feature_highlight, material_or_finish, dimensions, team_members, status";

/**
 * When public.listings has views_count and saves_count columns, append to listingCardSelect:
 * ", views_count, saves_count"
 * Normalize already defaults them to 0 when missing.
 */

/** Same as card for now; detail page may add more columns later (e.g. full description). */
export const listingDetailSelect = listingCardSelect;

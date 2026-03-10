/**
 * Single source of truth for listing select strings.
 * Use listingCardSelect for all card-rendering fetches (home, explore, related sections).
 */

/** Columns needed for listing cards. Select type (NOT NULL); normalizers use type ?? listing_type. */
export const listingCardSelect =
  "id, type, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, location, category, area_sqft, year, product_type, product_category, product_subcategory, feature_highlight, material_or_finish, dimensions, team_members, brands_used, views_count, saves_count";

/**
 * Canonical project listing select: all fields needed for ProjectCanonical.
 * NOTE: lifecycle columns (project_status, project_collaboration_status, project_looking_for)
 * are omitted here — they require the lifecycle migration to be applied first.
 * Use lifecycleProjectSelect for queries that need these fields.
 */
export const projectListingSelect =
  "id, type, slug, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, location, location_place_id, location_city, location_country, location_country_code, location_lat, location_lng, location_text, area_sqft, area_sqm, year, category, project_category, material_or_finish, team_members, brands_used, status, mentioned_products";

/**
 * Columns for product listings (listings.type = 'product').
 * NOTE: lifecycle columns (product_stage, product_collaboration_status, product_looking_for)
 * are omitted here — they require the lifecycle migration to be applied first.
 */
export const productListingSelect =
  "id, type, slug, title, description, created_at, updated_at, owner_clerk_user_id, owner_profile_id, cover_image_url, category, year, product_type, product_category, product_subcategory, feature_highlight, material_or_finish, dimensions, team_members, status, taxonomy_node_id";

/**
 * Extended project select including lifecycle/collaboration fields.
 * Only safe to use after running supabase/migrations/20260310_lifecycle_collaboration.sql.
 */
export const lifecycleProjectSelect =
  projectListingSelect + ", project_status, project_collaboration_status, project_looking_for";

/**
 * Extended product select including lifecycle/collaboration fields.
 * Only safe to use after running supabase/migrations/20260310_lifecycle_collaboration.sql.
 */
export const lifecycleProductSelect =
  productListingSelect + ", product_stage, product_collaboration_status, product_looking_for";

/** Same as card; detail page includes views_count, saves_count for display. */
export const listingDetailSelect = listingCardSelect;

/**
 * Listing type enum (matches Supabase listing_type)
 */
export type ListingType = "project" | "product";

export interface TeamMember {
  name: string;
  role: string;
}

export interface BrandUsed {
  name: string;
  logo_url?: string | null;
}

export interface MaterialTag {
  id: string;
  display_name: string;
  slug: string;
}

/**
 * Listing row from Supabase (full detail). Arrays normalized after fetch.
 */
export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  description: string | null;
  location: string | null;
  created_at: string;
  owner_clerk_user_id: string | null;
  owner_profile_id: string | null;
  cover_image_url: string | null;
  category: string | null;
  area_sqft: number | null;
  year: string | null;
  product_type: string | null;
  feature_highlight: string | null;
  material_or_finish: string | null;
  dimensions: string | null;
  team_members: TeamMember[];
  brands_used: BrandUsed[];
  materials?: MaterialTag[];
}

/** Detail page: Listing + normalized counts (0 when not in DB). */
export interface ListingDetail extends Listing {
  views_count: number;
  saves_count: number;
}

/**
 * Input for creating a listing (omit id, created_at)
 */
export interface CreateListingInput {
  type: ListingType;
  title: string;
  description: string | null;
  location?: string | null;
  owner_clerk_user_id?: string | null;
  owner_profile_id?: string | null;
  cover_image_url?: string | null;
  category?: string | null;
  area_sqft?: number | null;
  year?: string | null;
  product_type?: string | null;
  product_category?: string | null;
  product_subcategory?: string | null;
  feature_highlight?: string | null;
  material_or_finish?: string | null;
  dimensions?: string | null;
  team_members?: TeamMember[];
  brands_used?: BrandUsed[];
  slug?: string | null;
}

/**
 * Card data contract: same shape for all listing cards (home, lists, related).
 * Arrays and counts are always defined (never null) after normalize.
 */
export interface ListingCardData {
  id: string;
  type: ListingType;
  title: string;
  description: string | null;
  location: string | null;
  created_at: string;
  owner_clerk_user_id: string | null;
  owner_profile_id: string | null;
  cover_image_url: string | null;
  category: string | null;
  area_sqft: number | null;
  year: string | null;
  product_type: string | null;
  product_category: string | null;
  product_subcategory: string | null;
  feature_highlight: string | null;
  material_or_finish: string | null;
  dimensions: string | null;
  team_members: TeamMember[];
  brands_used: BrandUsed[];
  views_count: number;
  saves_count: number;
  /** Number of linked items (e.g. project_product_links). For "+X connections" label. */
  connection_count?: number;
  updated_at: string | null;
  materials?: MaterialTag[];
}

/**
 * Listing summary for list views. Prefer ListingCardData for card rendering.
 * @deprecated Use ListingCardData for card fetches; this type is kept for compatibility.
 */
export type ListingSummary = ListingCardData;

export interface ListingDocument {
  id: string;
  listing_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  sort_order: number;
  created_at: string;
  /** Path in storage bucket for signed URL (optional; can be derived from file_url). */
  storage_path?: string | null;
  /** Optional thumbnail path (e.g. PDF page 1). */
  preview_image_path?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
}

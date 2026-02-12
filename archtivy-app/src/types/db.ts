export type ProfileRole = "designer" | "brand" | "visitor";
export type ListingType = "project" | "product";

export interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  type: ListingType;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  alt: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectProductLink {
  id: string;
  project_id: string;
  product_id: string;
  created_at: string;
}

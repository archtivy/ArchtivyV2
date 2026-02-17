/**
 * Types for Explore Map API and UI.
 * Items are merged from listings (projects) and profiles (designers/brands).
 */

export type ExploreMode = "all" | "projects" | "designers" | "brands";

export type ExploreMapListingItem = {
  kind: "listing";
  entity: "project";
  id: string;
  type: "project";
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  location_text: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  year: string | null;
  project_category: string | null;
  area_sqft: number | null;
  saves_count: number;
  views_count: number;
  collaboration_open: boolean;
  status: string | null;
};

export type ExploreMapProfileItem = {
  kind: "profile";
  role: "designer" | "brand";
  id: string;
  display_name: string | null;
  username: string | null;
  slug: string | null;
  cover_image_url: string | null;
  avatar_url: string | null;
  location_text: string | null;
  location_city: string | null;
  location_country: string | null;
  location_lat: number | null;
  location_lng: number | null;
  designer_discipline: string | null;
  brand_type: string | null;
  collaboration_open: boolean;
};

export type ExploreMapItem = ExploreMapListingItem | ExploreMapProfileItem;

export function isListingItem(item: ExploreMapItem): item is ExploreMapListingItem {
  return item.kind === "listing";
}

export function isProfileItem(item: ExploreMapItem): item is ExploreMapProfileItem {
  return item.kind === "profile";
}

/** Stable id for map key and hover sync: listing-{id} or profile-{id} */
export function exploreItemKey(item: ExploreMapItem): string {
  return `${item.kind}-${item.id}`;
}

export function getItemLatLng(item: ExploreMapItem): { lat: number; lng: number } | null {
  const lat = "location_lat" in item ? item.location_lat : null;
  const lng = "location_lng" in item ? item.location_lng : null;
  if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }
  return null;
}

export type ExploreMapStats = {
  projects: number;
  designers: number;
  brands: number;
};

export type ExploreMapApiResponse = {
  items: ExploreMapItem[];
  stats: ExploreMapStats;
};

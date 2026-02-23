import type { ProjectCanonical, ProductCanonical, ProjectOwner } from "@/lib/canonical-models";
import type { ListingCardData } from "@/lib/types/listings";

/** Build minimal ProjectCanonical-like for ProjectCardPremium from listing + optional owner + cover URL. */
export function listingToProjectForCard(
  listing: ListingCardData,
  coverUrl: string | null,
  owner: ProjectOwner | null
): ProjectCanonical {
  const loc = listing.location?.trim();
  const connectionCount =
    (listing as { connection_count?: number }).connection_count ??
    (listing.team_members?.length ?? 0) + (listing.brands_used?.length ?? 0);
  return {
    id: listing.id,
    slug: listing.id,
    title: listing.title ?? "",
    description: listing.description ?? null,
    category: listing.category ?? null,
    year: listing.year ? parseInt(String(listing.year), 10) : null,
    area_sqft: listing.area_sqft ?? null,
    area_sqm: null,
    location: loc ? { city: loc.split(",")[0]?.trim() ?? null, country: null } : null,
    location_text: loc,
    cover: coverUrl ?? listing.cover_image_url ?? null,
    gallery: [],
    materials: [],
    material_tags: [],
    team_members: listing.team_members ?? [],
    documents: [],
    owner_clerk_user_id: listing.owner_clerk_user_id,
    owner,
    connectionCount,
    created_at: listing.created_at ?? "",
    updated_at: listing.updated_at ?? null,
    status: "APPROVED",
    mentioned_products: (listing as { mentioned_products?: { brand_name_text: string; product_name_text: string }[] }).mentioned_products ?? [],
    brands_used: (listing.brands_used ?? []).map((b) => ({ name: b.name, logo_url: b.logo_url ?? null })),
  } as ProjectCanonical;
}

/** Build minimal ProductCanonical-like for ProductCardPremium from listing + optional owner + cover URL. */
export function listingToProductForCard(
  listing: ListingCardData,
  coverUrl: string | null,
  owner: ProjectOwner | null
): ProductCanonical {
  const connectionCount =
    (listing as { connection_count?: number }).connection_count ??
    (listing.team_members?.length ?? 0);
  return {
    id: listing.id,
    slug: listing.id,
    title: listing.title ?? "",
    description: listing.description ?? null,
    category: listing.category ?? null,
    material_type: listing.product_type ?? null,
    color: null,
    year: listing.year ? parseInt(String(listing.year), 10) : null,
    brand_profile_id: listing.owner_profile_id ?? null,
    team_members: listing.team_members ?? [],
    documents: [],
    cover: coverUrl ?? listing.cover_image_url ?? null,
    gallery: [],
    owner_clerk_user_id: listing.owner_clerk_user_id ?? null,
    owner,
    connectionCount,
    created_at: listing.created_at ?? "",
    materials: [],
    material_tags: [],
    status: "APPROVED",
  } as ProductCanonical;
}

import type { ListingCardData } from "@/lib/types/listings";
import { getListingUrl } from "@/lib/canonical";
import { ProductListingCard } from "./ProductListingCard";

export interface ProductCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical product URL. */
  href?: string | null;
  /** Owner display name (already resolved by caller). */
  postedBy?: string | null;
}

export function ProductCard({ listing, imageUrl, href, postedBy }: ProductCardProps) {
  const linkHref = href?.trim() || getListingUrl(listing);
  const title = listing.title?.trim() || "Product";

  // Build brand href from owner_profile_id when available (redirects to profile slug page)
  const brandHref = listing.owner_profile_id
    ? `/u/id/${listing.owner_profile_id}`
    : null;

  const connectionsCount = listing.used_in_projects_count ?? 0;

  return (
    <ProductListingCard
      image={imageUrl}
      imageAlt={title}
      brandName={postedBy ?? null}
      brandHref={brandHref}
      title={title}
      href={linkHref}
      connectionsCount={connectionsCount}
    />
  );
}

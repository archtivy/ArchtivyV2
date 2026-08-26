import type { ListingCardData } from "@/lib/types/listings";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { listingRowToCardModel, type CardCounts } from "@/lib/cards/toListingCardModel";

/**
 * Product card for surfaces holding a raw `listings` row. The counterpart of
 * ProjectCard; see the note there.
 */
export interface ProductCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. */
  href?: string | null;
  /** Brand display name (already resolved by caller). */
  postedBy?: string | null;
  counts?: CardCounts;
  initialSaved?: boolean;
}

export function ProductCard({
  listing,
  imageUrl,
  href,
  postedBy,
  counts,
  initialSaved = false,
}: ProductCardProps) {
  return (
    <ListingCardShared
      model={listingRowToCardModel(listing, {
        type: "product",
        imageUrl,
        href,
        authorName: postedBy,
        counts,
        initialSaved,
      })}
      ratio="1/1"
    />
  );
}

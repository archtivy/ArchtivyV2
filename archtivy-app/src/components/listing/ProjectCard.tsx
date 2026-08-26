import type { ListingCardData } from "@/lib/types/listings";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { listingRowToCardModel, type CardCounts } from "@/lib/cards/toListingCardModel";

/**
 * Project card for surfaces holding a raw `listings` row rather than a
 * normalised ProjectCanonical — saved boards and the linked-listings rails.
 *
 * Now a thin adapter over ListingCardShared, like ProjectCardPremium. The two
 * existed separately only because of this input difference; that difference now
 * lives in listingRowToCardModel and nowhere else.
 *
 * ── areaSqft / areaSqm ARE GONE ─────────────────────────────────────────────
 * Both props, and the sqm→sqft conversion each adapter carried its own copy of,
 * were removed by request. No caller was passing them for anything the new card
 * shows.
 */
export interface ProjectCardProps {
  listing: ListingCardData;
  imageUrl?: string | null;
  /** Override canonical URL. */
  href?: string | null;
  /** Owner display name (already resolved by caller). */
  postedBy?: string | null;
  /** Location text override. */
  location?: string | null;
  counts?: CardCounts;
  initialSaved?: boolean;
}

export function ProjectCard({
  listing,
  imageUrl,
  href,
  postedBy,
  location,
  counts,
  initialSaved = false,
}: ProjectCardProps) {
  return (
    <ListingCardShared
      model={listingRowToCardModel(listing, {
        type: "project",
        imageUrl,
        href,
        authorName: postedBy,
        location,
        counts,
        initialSaved,
      })}
    />
  );
}

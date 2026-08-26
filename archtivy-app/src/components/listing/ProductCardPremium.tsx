import type { ProductCanonical } from "@/lib/canonical-models";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { productToCardModel, type CardCounts } from "@/lib/cards/toListingCardModel";

/**
 * Product card for surfaces holding normalised ProductCanonical data. The
 * counterpart of ProjectCardPremium; see the note there for why both are now
 * thin adapters over ListingCardShared.
 *
 * Renders 1/1 rather than 4/3: a product photograph is a catalogue shot on a
 * plain field, and the square ratio is what the product grids already used.
 */
export interface ProductCardPremiumProps {
  product: ProductCanonical;
  counts?: CardCounts;
  priority?: boolean;
  initialSaved?: boolean;
}

export function ProductCardPremium({
  product,
  counts,
  priority = false,
  initialSaved = false,
}: ProductCardPremiumProps) {
  return (
    <ListingCardShared
      model={productToCardModel(product, counts, initialSaved)}
      ratio="1/1"
      priority={priority}
    />
  );
}

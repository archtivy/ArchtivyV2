import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";

/**
 * A full-width row of product cards below the product detail fold.
 *
 * ── ONE RAIL, THREE USES ────────────────────────────────────────────────────
 * The product page now ends in a stack of product rows — "Often specified
 * with", "More from {brand}", and the category-related row — and they differ
 * only in their heading and their source query. Writing three of them would
 * reproduce, on a single page, the near-duplicate divergence that has already
 * produced seven logged bugs in this codebase. They share this component, so a
 * change to the grid or the card treatment cannot land on one and miss two.
 *
 * ── TYPE: PRODUCT, NOT PROJECT ──────────────────────────────────────────────
 * Every card here is a product and is declared as one. This matters visually,
 * not just semantically: ListingCardShared gives products a white tile with an
 * uncropped image and projects a stone tile with a 4/3 crop. The sidebar
 * RelatedPanel this replaces on the product page hardcoded `type: "project"`,
 * so a product page's related PRODUCTS were drawn with the project treatment —
 * cropped photographs on stone, in a catalogue context.
 *
 * Renders nothing when empty, like every other conditional module on the page.
 */

export interface ProductRailItem {
  id: string;
  title: string;
  href: string;
  cover: string | null;
  brand: string | null;
}

export function ProductRail({
  title,
  subtitle,
  items,
}: {
  title: string;
  /** Optional line under the heading, naming the basis for the selection. */
  subtitle?: string;
  items: ProductRailItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-20" aria-label={title}>
      <HomeSectionHeader title={title} />
      {subtitle && <p className="-mt-4 mb-6 font-body text-[13px] text-muted">{subtitle}</p>}
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items.map((item) => (
          <ListingCardShared
            key={item.id}
            model={{
              id: item.id,
              type: "product",
              title: item.title,
              href: item.href,
              imageUrl: item.cover,
              authorName: item.brand,
            }}
            ratio="1/1"
            sizes="(max-width: 640px) 45vw, 22vw"
          />
        ))}
      </div>
    </section>
  );
}

import { ListingCardShared, type ListingCardModel } from "@/components/listing/ListingCardShared";
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
 * ── FULL CARD MODELS, NOT PARTIAL ONES ──────────────────────────────────────
 * `items` are complete ListingCardModels, built by getProductRailCards from
 * the same fields the products directory shows: category, sub-type, brand
 * logo chip and the relationship badge. Passing a stripped model would make
 * the one shared card draw a visibly poorer version of itself here than on
 * /products, which reads as a second card design and is exactly what the
 * shared card exists to prevent. Nothing about the card is overridden.
 *
 * Renders nothing when empty, like every other conditional module on the page.
 */

export function ProductRail({
  id,
  title,
  subtitle,
  items,
}: {
  /** Optional anchor, so a link elsewhere can land on this rail. */
  id?: string;
  title: string;
  /** Optional line under the heading, naming the basis for the selection. */
  subtitle?: string;
  items: ListingCardModel[];
}) {
  if (items.length === 0) return null;

  return (
    <section id={id} className="mt-20" aria-label={title}>
      <HomeSectionHeader title={title} />
      {subtitle && <p className="-mt-4 mb-6 font-body text-[13px] text-muted">{subtitle}</p>}
      {/* Five across on a large desktop, stepping down to four, three and two.
          The column gap tightens with the column count rather than staying at
          one value: five cards at a 16px gutter inside this container leaves
          each card too narrow for its title, and the same 16px around two
          cards on a phone is generous. The card itself is fluid — nothing here
          overrides its width, padding or type. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <ListingCardShared
            key={item.id}
            model={item}
            ratio="1/1"
            sizes="(max-width: 640px) 45vw, (max-width: 1280px) 24vw, 18vw"
          />
        ))}
      </div>
    </section>
  );
}

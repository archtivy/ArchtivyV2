import { ProductRail } from "@/components/products/ProductRail";
import { getListingUrl } from "@/lib/canonical";
import type { OftenSpecifiedWithItem } from "@/lib/db/oftenSpecifiedWith";

/**
 * "Often specified with" — replaces the mockup's "You May Also Like".
 *
 * The rename is the point. "You may also like" claims a model of the viewer's
 * taste; this platform has none, and inventing a similarity score would be the
 * same fabrication as a review count. What the data actually supports is
 * "these were specified in the same buildings", so that is what the heading
 * says.
 *
 * The subtitle changes with the tier that produced the rows, so the page never
 * implies a stronger relationship than it found: co-occurrence is a real
 * editorial link, same-category is an admission that it is only a category
 * match. When the list mixes both, the weaker claim wins.
 *
 * The rendering itself is ProductRail, shared with the two other product rows
 * that now sit below this one. Only the heading, the subtitle and the query
 * are this module's own.
 */
export function OftenSpecifiedWith({ items }: { items: OftenSpecifiedWithItem[] }) {
  if (items.length === 0) return null;

  const allCoOccurrence = items.every((i) => i.basis === "co_occurrence");

  return (
    <ProductRail
      title="Often specified with"
      subtitle={
        allCoOccurrence
          ? "Specified alongside this product in real projects."
          : "From the same category."
      }
      items={items.map((i) => ({
        id: i.id,
        title: i.title,
        href: getListingUrl({ id: i.id, type: "product", slug: i.slug }),
        cover: i.cover,
        brand: i.brand,
      }))}
    />
  );
}

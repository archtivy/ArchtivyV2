import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
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
 * Renders nothing when empty, like every other conditional module here.
 */
export function OftenSpecifiedWith({ items }: { items: OftenSpecifiedWithItem[] }) {
  if (items.length === 0) return null;

  const allCoOccurrence = items.every((i) => i.basis === "co_occurrence");
  const subtitle = allCoOccurrence
    ? "Specified alongside this product in real projects."
    : "From the same category.";

  return (
    <section className="mt-20" aria-labelledby="often-specified-with-heading">
      <HomeSectionHeader title="Often specified with" />
      <p className="-mt-4 mb-6 font-body text-[13px] text-muted">{subtitle}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
        {items.map((item) => (
          <ListingCardShared
            key={item.id}
            model={{
              id: item.id,
              type: "product",
              title: item.title,
              href: getListingUrl({ id: item.id, type: "product", slug: item.slug }),
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

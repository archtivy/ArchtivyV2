import type { ProductDetail } from "@/lib/db/productDetail";

/**
 * The product description.
 *
 * ── THIS WAS A TAB STRIP, AND IS NOT ANY MORE ───────────────────────────────
 * Three tabs became one. "Details" printed Category, Type, Style, Materials,
 * Dimensions and Year — every one of which is now a self-omitting row in the
 * specification beside the title, so the tab was a second copy of the panel
 * next to it. "Downloads" moved into the sticky sidebar, where a spec sheet is
 * reachable instead of being one click behind a tab that only existed on the
 * 49 of 80 products that have a file.
 *
 * That left About alone, and one tab is not a choice — the same rule
 * DiscoverSection follows when only one of its tabs has anything behind it.
 * The strip is gone and the heading keeps the underline the active tab had, so
 * the page rhythm below the gallery is unchanged.
 *
 * The chips that used to sit under the description went with the tab. They
 * repeated Style, Materials and Year, which now all appear as rows a few
 * hundred pixels to the right; on a page whose whole argument is that every
 * field is stated once and only when real, printing three of them twice was
 * the loudest thing on the screen.
 */
export function ProductAbout({ product }: { product: ProductDetail }) {
  return (
    <section className="mt-8" aria-labelledby="product-about-heading">
      <div className="border-b border-hairline">
        <h2
          id="product-about-heading"
          className="inline-block border-b-2 border-ink px-4 py-3 font-body text-[14px] text-ink"
        >
          About
        </h2>
      </div>

      <div className="py-8">
        {product.description ? (
          <div className="max-w-[68ch] space-y-4">
            {product.description
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((para, i) => (
                <p key={i} className="font-body text-[15px] leading-[26px] text-ink/85">
                  {para.trim()}
                </p>
              ))}
          </div>
        ) : (
          <p className="font-body text-[14px] text-muted">No description added yet.</p>
        )}
      </div>
    </section>
  );
}

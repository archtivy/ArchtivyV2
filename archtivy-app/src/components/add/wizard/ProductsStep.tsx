"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PickerStep } from "@/components/add/wizard/WizardPrimitives";
import { ProductPinEditor } from "@/components/listing/ProductPinEditor";
import { getListingTaggingData } from "@/app/actions/productTags";
import { syncDraftGallery } from "@/app/actions/listingDrafts";
import { PUBLIC_STATUSES, type ManagedImage, type TaggableProduct } from "@/lib/db/productTags";

/**
 * The Products step: both ways a product can belong to a project, in one place.
 *
 * ── TWO RELATIONSHIPS, NOT ONE ──────────────────────────────────────────────
 * A product can be USED IN THE PROJECT without appearing in any photo — the
 * paint, the underfloor system, the thing that is behind a wall. And it can be
 * TAGGED IN A PHOTO, which is a claim about a specific pixel of a specific
 * image. They are different statements, they are stored differently
 * (project_product_links.source = 'manual' vs 'photo_tag'), and an author has to
 * be able to make either one without the other.
 *
 * Putting them in one step is what makes the distinction legible. Split across
 * two steps, "why is this product listed twice?" has no visible answer.
 *
 * ── WHY TAGGING CAN ONLY EXIST HERE NOW ─────────────────────────────────────
 * A pin attaches to a listing_image.id. Before draft-first persistence there was
 * no listings row — and so no listing_images rows — until publish, which is why
 * tagging used to be a separate trip to /me/listings/[id] afterwards. The draft
 * is created when the Images step completes, two steps earlier, so by the time
 * the author arrives here the ids exist.
 *
 * When there is no draft yet (admin context, which still submits in one go) the
 * picker still works and the tagger explains itself rather than appearing
 * broken.
 */

export interface ProductsStepProduct {
  id: string;
  title: string;
  brand: string | null;
  cover: string | null;
}

export function ProductsStep({
  products,
  selectedIds,
  onChange,
  listingId,
  gallery,
}: {
  products: ProductsStepProduct[];
  /** Products marked "used in this project" — the manual links. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** The draft (or existing) listing. Null while no row exists yet. */
  listingId: string | null;
  /** What the Images step currently holds, so a draft's rows can catch up. */
  gallery: { url: string; alt?: string }[];
}) {
  const [images, setImages] = useState<ManagedImage[] | null>(null);
  const [taggable, setTaggable] = useState<TaggableProduct[]>([]);
  const [tagsTableReady, setTagsTableReady] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId) return;
    // Reconcile first: a photo added after the draft was created exists in
    // wizard state but has no listing_images row yet, and a pin needs that id.
    // No-ops for anything already published.
    await syncDraftGallery(listingId, JSON.stringify(gallery));
    const result = await getListingTaggingData(listingId);
    if (!result.ok) {
      setLoadError(result.error);
      return;
    }
    setLoadError(null);
    setImages(result.images);
    setTaggable(result.products);
    setTagsTableReady(result.tagsTableReady);
  }, [listingId, gallery]);

  useEffect(() => {
    void load();
  }, [load]);

  /*
   * Products that are pinned somewhere, and publicly so.
   *
   * Only public pins count, for the same reason the link invariant uses them:
   * an unverified AI suggestion is hidden on the page, and labelling a product
   * "tagged in a photo" while no visitor can see that tag would be telling the
   * author something untrue about their own listing.
   */
  const taggedIds = useMemo(() => {
    const set = new Set<string>();
    for (const img of images ?? []) {
      for (const pin of img.pins) {
        if (PUBLIC_STATUSES.includes(pin.verificationStatus)) set.add(pin.taggedListingId);
      }
    }
    return set;
  }, [images]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /*
   * The union, because the two sets overlap and neither contains the other. A
   * product can be picked, pinned, or both — and "both" is normal, not an error
   * worth flagging.
   */
  const summary = useMemo(() => {
    const ids = new Set<string>([...selectedIds, ...taggedIds]);
    return [...ids].map((id) => ({
      id,
      title: byId.get(id)?.title ?? taggable.find((t) => t.id === id)?.title ?? "Unknown product",
      brand: byId.get(id)?.brand ?? taggable.find((t) => t.id === id)?.brandName ?? null,
      used: selectedIds.includes(id),
      tagged: taggedIds.has(id),
    }));
  }, [selectedIds, taggedIds, byId, taggable]);

  return (
    <div className="space-y-10">
      <section>
        <h3 className="font-body text-[14px] text-ink">Used in this project</h3>
        <p className="mt-1 max-w-[60ch] font-body text-[13px] text-muted">
          Everything specified for the build. A product belongs here whether or not it is
          visible in a photo.
        </p>
        <div className="mt-4">
          <PickerStep
            kind="product"
            options={products.map((p) => ({
              id: p.id,
              label: p.title,
              sub: p.brand,
              cover: p.cover,
            }))}
            selected={selectedIds}
            onChange={onChange}
            placeholder="Search products by name or brand…"
            emptyHint="No products added yet."
          />
        </div>
      </section>

      <section>
        <h3 className="font-body text-[14px] text-ink">Tagged in your photos</h3>
        <p className="mt-1 max-w-[60ch] font-body text-[13px] text-muted">
          Pin a product to the exact spot it appears. Pins show on the public page and link
          straight to the product.
        </p>

        <div className="mt-4">
          {!listingId ? (
            <p className="rounded-2xl border border-hairline px-6 py-10 text-center font-body text-[13px] text-muted">
              Photo tagging becomes available once your images are saved — finish the Images
              step and come back.
            </p>
          ) : loadError ? (
            <p className="rounded-2xl border border-hairline bg-stone/40 px-4 py-3 font-body text-[13px] text-ink">
              {loadError}
            </p>
          ) : images === null ? (
            <p className="rounded-2xl border border-hairline px-6 py-10 text-center font-body text-[13px] text-muted">
              Loading your photos…
            </p>
          ) : (
            <ProductPinEditor
              images={images}
              products={taggable}
              tagsTableReady={tagsTableReady}
              onChanged={load}
              emptyHint="Your photos are still saving. Give it a moment, then reload this step."
            />
          )}
        </div>
      </section>

      {summary.length > 0 && (
        <section>
          <h3 className="font-body text-[14px] text-ink">
            On this project <span className="text-muted">({summary.length})</span>
          </h3>
          <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
            {summary.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-body text-[14px] text-ink">{row.title}</span>
                  {row.brand && (
                    <span className="block truncate font-body text-[12px] text-muted">
                      {row.brand}
                    </span>
                  )}
                </span>
                {/* Both badges when both are true. The states are additive, and
                    collapsing them would hide that a pinned product is also
                    explicitly specified. */}
                <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {row.used && <Badge tone="solid">Used</Badge>}
                  {row.tagged && <Badge tone="outline">In photo</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: "solid" | "outline"; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-body text-[11px] leading-none tracking-[0.02em] ${
        tone === "solid" ? "bg-ink text-cream" : "border border-ink/25 text-ink"
      }`}
    >
      {children}
    </span>
  );
}

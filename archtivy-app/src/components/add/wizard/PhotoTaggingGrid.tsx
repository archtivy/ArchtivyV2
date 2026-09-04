"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { Tag, X } from "lucide-react";
import { ProductPinEditor } from "@/components/listing/ProductPinEditor";
import type { ManagedImage, TaggableProduct } from "@/lib/db/productTags";

/**
 * Photo tagging as a contact sheet: every photo at once, then one at a time.
 *
 * ── WHY A GRID AND A MODAL ──────────────────────────────────────────────────
 * Tagging used to open on the first photo with the rest as a thin filmstrip
 * underneath. That made the set hard to survey — you could not see at a glance
 * which photos still had nothing pinned to them, which is the only question an
 * author is actually asking at this step. The grid answers it: every photo,
 * its real proportions, and a count of what is already pinned.
 *
 * Clicking one opens it large, because placing a pin accurately needs the
 * photograph big and nothing else competing for the space.
 *
 * ── IT IS NOT THE PUBLIC LIGHTBOX ───────────────────────────────────────────
 * Deliberately a separate component. The public gallery lightbox is a reading
 * surface with its own discovery feed and its own behaviour, and it is not
 * imported, extended or altered here — this is an editing surface that happens
 * to also be full-screen.
 *
 * ── AND IT DOES NOT REIMPLEMENT TAGGING ─────────────────────────────────────
 * Everything inside the modal is ProductPinEditor, unchanged: click-to-place,
 * product search, existing pins, review and delete, and the image strip that
 * moves between photos without leaving. The only thing added to it was an
 * `initialImageId` prop so this grid can say which photo to open on. There is
 * no second pin data model and no second write path — the same server actions
 * persist the same rows.
 */
export function PhotoTaggingGrid({
  images,
  products,
  tagsTableReady,
  onChanged,
}: {
  images: ManagedImage[];
  products: TaggableProduct[];
  tagsTableReady: boolean;
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpenId(null), []);

  /*
   * Escape closes, and the page behind does not scroll while the editor is
   * open. Both are table stakes for a full-screen surface, and the public
   * lightbox is not available to inherit them from — see the note above.
   */
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openId, close]);

  if (images.length === 0) {
    return (
      <p className="rounded-2xl border border-hairline px-6 py-10 text-center font-body text-[13px] text-muted">
        Add photos in the Images step and they will appear here, ready to tag.
      </p>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => {
          const count = img.pins?.length ?? 0;
          return (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setOpenId(img.id)}
                aria-label={`Tag products on ${img.alt || "this photo"}${
                  count > 0 ? `, ${count} already tagged` : ""
                }`}
                className="group relative block w-full overflow-hidden rounded-xl border border-hairline bg-stone/30 text-left transition-colors hover:border-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                {/*
                  The photograph's own proportions, not a fixed box. A contact
                  sheet that crops every image to the same rectangle hides the
                  thing the author is about to point at.
                */}
                <Image
                  src={img.url}
                  alt=""
                  width={480}
                  height={480}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 22vw"
                  className="h-auto w-full"
                />

                {/* Says what this does before it is clicked. */}
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-opacity duration-150 group-hover:bg-ink/35 group-hover:opacity-100 group-focus-visible:bg-ink/35 group-focus-visible:opacity-100">
                  <span className="rounded-full bg-cream px-3 py-1.5 font-body text-[12px] text-ink">
                    Tag products
                  </span>
                </span>

                <span
                  className={[
                    "pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 font-body text-[11px]",
                    count > 0 ? "bg-ink text-cream" : "bg-cream/90 text-muted",
                  ].join(" ")}
                >
                  <Tag strokeWidth={1.5} className="h-3 w-3" aria-hidden />
                  {count > 0 ? `${count} tagged` : "None yet"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/*
        Portalled to the body so the wizard's own stacking and overflow cannot
        clip a full-screen editor — the same reason the message modal is
        portalled.
      */}
      {openId &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col bg-cream"
            role="dialog"
            aria-modal="true"
            aria-label="Tag products on this photo"
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="font-body text-[14px] text-ink">Tag products</p>
                <p className="truncate font-body text-[12.5px] text-muted">
                  Click the photo where a product appears, then choose it. Use the strip below
                  to move between photos.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-stone/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
              >
                <X strokeWidth={1.5} className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <div className="mx-auto w-full max-w-[1200px]">
                <ProductPinEditor
                  images={images}
                  products={products}
                  tagsTableReady={tagsTableReady}
                  onChanged={onChanged}
                  initialImageId={openId}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

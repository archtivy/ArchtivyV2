"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addPhotoProductTagAction,
  searchProductsAction,
} from "@/app/actions/projectBrandsProducts";

export interface PhotoTagRecord {
  id: string;
  listing_image_id: string;
  product_id: string;
  x: number;
  y: number;
}

export interface PhotoTaggerProps {
  listingId: string;
  listingImageId: string;
  imageUrl: string;
  imageAlt?: string;
  existingTags: PhotoTagRecord[];
  onTagAdded?: (tag: PhotoTagRecord) => void;
  onTagRemoved?: (tagId: string) => void;
  /** Optional brand profile id to filter product search. */
  brandProfileId?: string | null;
  disabled?: boolean;
}

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

export function PhotoTagger({
  listingId,
  listingImageId,
  imageUrl,
  imageAlt = "",
  existingTags,
  onTagAdded,
  brandProfileId,
  disabled,
}: PhotoTaggerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ clientX: number; clientY: number; normX: number; normY: number } | null>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<{ id: string; title: string; slug: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!popover) return;
      setLoading(true);
      searchProductsAction(query, brandProfileId ?? undefined).then((res) => {
        setProducts(res.data ?? []);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, popover, brandProfileId]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      setPopover({ clientX: e.clientX, clientY: e.clientY, normX, normY });
      setQuery("");
      setProducts([]);
    },
    [disabled]
  );

  const addTag = useCallback(
    async (productId: string) => {
      if (!popover) return;
      setAdding(true);
      const normX = Math.max(0, Math.min(1, popover.normX));
      const normY = Math.max(0, Math.min(1, popover.normY));
      const res = await addPhotoProductTagAction(
        listingImageId,
        listingId,
        productId,
        normX,
        normY
      );
      setAdding(false);
      if (res.error) return;
      setPopover(null);
      onTagAdded?.({
        id: res.data!.id,
        listing_image_id: listingImageId,
        product_id: productId,
        x: normX,
        y: normY,
      });
    },
    [listingId, listingImageId, popover, onTagAdded]
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleImageClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleImageClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }}
        className={`relative cursor-crosshair overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 ${
          disabled ? "cursor-not-allowed opacity-70" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={imageAlt}
          className="block max-h-64 w-full object-contain"
        />
        {existingTags.map((t) => (
          <span
            key={t.id}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-archtivy-primary bg-white text-xs font-medium text-archtivy-primary dark:bg-zinc-900"
            style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
            title={`Product: ${t.product_id}`}
          />
        ))}
      </div>
      {popover && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-20 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            style={{
              left: Math.min(popover.clientX, typeof window !== "undefined" ? window.innerWidth - 300 : popover.clientX),
              top: popover.clientY + 8,
            }}
          >
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Add product tag
            </p>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className={inputClass}
              autoFocus
            />
            <div className="mt-2 max-h-40 overflow-auto">
              {loading && (
                <p className="py-2 text-center text-sm text-zinc-500">Loading…</p>
              )}
              {!loading &&
                products.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={adding}
                    onClick={() => addTag(p.id)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {p.title}
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

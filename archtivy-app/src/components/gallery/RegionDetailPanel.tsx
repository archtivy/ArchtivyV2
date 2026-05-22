"use client";

import Image from "next/image";
import Link from "next/link";
import { getListingUrl } from "@/lib/canonical";
import type { ImageRegionMarker } from "@/lib/db/gallery";

interface RegionDetailPanelProps {
  region: ImageRegionMarker;
  onClose: () => void;
  /** "desktop" = right-side panel, "mobile" = bottom sheet */
  mode: "desktop" | "mobile";
}

/**
 * Panel showing product matches for a selected image region/hotspot.
 * Desktop: renders as a right-side panel inside the lightbox.
 * Mobile: renders as a bottom sheet overlay.
 */
export function RegionDetailPanel({ region, onClose, mode }: RegionDetailPanelProps) {
  const hasMatch = region.selected_mode === "matched" && region.matched_product;
  const similarLabel = region.object_type === "seating"
    ? "Similar seating"
    : region.object_type === "lighting"
      ? "Similar lighting"
      : region.object_type === "table"
        ? "Similar tables"
        : `Similar ${region.label}`;

  if (mode === "mobile") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden">
        <div className="absolute inset-0 -top-20 bg-gradient-to-t from-black/40 to-transparent" onClick={onClose} />
        <div
          className="relative max-h-[60vh] overflow-auto bg-white dark:bg-zinc-900"
          style={{
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{region.object_type}</p>
              <p className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">{region.label}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          {hasMatch && region.matched_product && (
            <div className="px-4 pb-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Matched product</p>
              <ProductCard product={region.matched_product} />
            </div>
          )}

          {region.similar_products.length > 0 && (
            <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{similarLabel}</p>
              <div className="space-y-2">
                {region.similar_products.filter((p) => p.listing_id !== region.matched_product?.listing_id).slice(0, 4).map((p) => (
                  <ProductCard key={p.listing_id} product={p} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop panel
  return (
    <div className="flex h-full w-72 flex-col border-l border-zinc-800 bg-[#1a1a1d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{region.object_type}</p>
          <p className="text-[14px] font-medium text-zinc-100">{region.label}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Keywords */}
      {region.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 px-4 pb-3">
          {region.keywords.slice(0, 5).map((kw) => (
            <span
              key={kw}
              className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400"
              style={{ borderRadius: 3 }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Matched product */}
      {hasMatch && region.matched_product && (
        <div className="border-t border-zinc-800 px-4 pb-3 pt-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Matched product</p>
          <ProductCard product={region.matched_product} dark />
        </div>
      )}

      {/* Similar products */}
      {region.similar_products.length > 0 && (
        <div className="flex-1 overflow-auto border-t border-zinc-800 px-4 pb-4 pt-3">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">{similarLabel}</p>
          <div className="space-y-2">
            {region.similar_products
              .filter((p) => p.listing_id !== region.matched_product?.listing_id)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.listing_id} product={p} dark compact />
              ))}
          </div>
        </div>
      )}

      {region.similar_products.length === 0 && !hasMatch && (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-zinc-500">No similar products found yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Product card ────────────────────────────────────────────────────────────

function ProductCard({
  product,
  dark = false,
  compact = false,
}: {
  product: { listing_id: string; title: string; slug: string | null; cover: string | null; brand: string | null; score: number };
  dark?: boolean;
  compact?: boolean;
}) {
  const href = getListingUrl({ id: product.listing_id, type: "product", slug: product.slug });

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded p-1.5 transition ${
        dark ? "hover:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
      }`}
      style={{ borderRadius: 4 }}
    >
      <div
        className={`shrink-0 overflow-hidden ${compact ? "h-10 w-14" : "h-12 w-16"} ${dark ? "bg-zinc-800" : "bg-zinc-100 dark:bg-zinc-800"}`}
        style={{ borderRadius: 3 }}
      >
        {product.cover ? (
          <Image
            src={product.cover}
            alt=""
            width={compact ? 56 : 64}
            height={compact ? 40 : 48}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-500">—</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[12px] font-medium leading-tight ${dark ? "text-zinc-200 group-hover:text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
          {product.title}
        </p>
        {product.brand && (
          <p className={`mt-0.5 truncate text-[10px] ${dark ? "text-zinc-500" : "text-zinc-400"}`}>
            {product.brand}
          </p>
        )}
      </div>
    </Link>
  );
}

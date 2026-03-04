"use client";

import Image from "next/image";
import type { ScoredProduct } from "@/app/actions/smartProductTagging";

const ACCENT = "#002abf";

function scoreBadgeClass(score: number): string {
  if (score >= 0.7) return "bg-green-100 text-green-700";
  if (score >= 0.4) return "bg-amber-100 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

interface ProductSuggestionCardProps {
  product: ScoredProduct;
  isTagged: boolean;
  tagging?: boolean;
  onTag: () => void;
  onRemove: () => void;
}

export function ProductSuggestionCard({
  product,
  isTagged,
  tagging,
  onTag,
  onRemove,
}: ProductSuggestionCardProps) {
  const pct = Math.round(product.score * 100);

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 transition">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-zinc-100">
        {product.coverImageUrl ? (
          <Image
            src={product.coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="160px"
            unoptimized={product.coverImageUrl.startsWith("http")}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-zinc-300 text-2xl">
            &mdash;
          </span>
        )}
        {/* Score badge */}
        <span
          className={`absolute top-1 right-1 px-1.5 py-0.5 text-[10px] font-semibold rounded ${scoreBadgeClass(product.score)}`}
        >
          {pct}%
        </span>
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="text-xs font-medium text-zinc-900 truncate leading-tight">
          {product.title ?? "Untitled"}
        </p>
        {product.brandName && (
          <p className="text-[10px] text-zinc-500 truncate">{product.brandName}</p>
        )}
        {product.matchReasons.length > 0 && (
          <p className="text-[10px] text-zinc-400 truncate mt-0.5">
            {product.matchReasons.slice(0, 2).join(" · ")}
          </p>
        )}
      </div>

      {/* Action */}
      <div className="px-2 pb-2">
        {isTagged ? (
          <button
            type="button"
            onClick={onRemove}
            className="w-full px-2 py-1 text-[11px] font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition"
          >
            &#10003; Tagged
          </button>
        ) : (
          <button
            type="button"
            onClick={onTag}
            disabled={tagging}
            className="w-full px-2 py-1 text-[11px] font-medium text-white rounded disabled:opacity-50 transition"
            style={{ backgroundColor: ACCENT }}
          >
            {tagging ? "\u2026" : "Tag"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Skeleton placeholder for a product card grid. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-lg border border-zinc-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-zinc-100" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 bg-zinc-100 rounded w-3/4" />
        <div className="h-2.5 bg-zinc-50 rounded w-1/2" />
      </div>
      <div className="px-2 pb-2">
        <div className="h-6 bg-zinc-100 rounded" />
      </div>
    </div>
  );
}

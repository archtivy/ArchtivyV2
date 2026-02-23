"use client";

import * as React from "react";
import Image from "next/image";

export interface SuggestionProduct {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  brand_name: string | null;
}

export interface VisualSuggestionsListProps {
  products: SuggestionProduct[];
  loading: boolean;
  /** Optional inline search query (controlled). */
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onSelectProduct: (productId: string) => void;
  selecting?: boolean;
  limit?: number;
  /** Thumbnail size in px (default 48). */
  thumbSize?: number;
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

export function VisualSuggestionsList({
  products,
  loading,
  searchQuery = "",
  onSearchQueryChange,
  onSelectProduct,
  selecting,
  limit = 12,
  thumbSize = 48,
}: VisualSuggestionsListProps) {
  const display = products.slice(0, limit);

  return (
    <div className="space-y-2">
      {onSearchQueryChange && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search within suggestions…"
          className={inputClass}
        />
      )}
      {loading && (
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
              <div
                className="shrink-0 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700"
                style={{ width: thumbSize, height: thumbSize }}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </li>
          ))}
        </ul>
      )}
      {!loading && display.length === 0 && (
        <p className="text-sm text-zinc-500">No products match. Adjust filters or search.</p>
      )}
      {!loading && display.length > 0 && (
        <ul className="space-y-2">
          {display.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelectProduct(p.id)}
                disabled={selecting}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left transition hover:border-[#002abf] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div
                  className="relative shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-700"
                  style={{ width: thumbSize, height: thumbSize }}
                >
                  {p.cover_image_url ? (
                    <Image
                      src={p.cover_image_url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized={p.cover_image_url.startsWith("http")}
                      sizes={`${thumbSize}px`}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {p.title ?? "Untitled"}
                  </span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {p.brand_name ? `by ${p.brand_name}` : "—"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

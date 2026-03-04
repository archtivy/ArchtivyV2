"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAltTextSuggestions,
  searchProductsByText,
  deleteTag,
  type ScoredProduct,
} from "@/app/actions/smartProductTagging";
import { addPhotoProductTagAction } from "@/app/actions/projectBrandsProducts";
import type {
  EditorialImage,
  EditorialProductTag,
} from "@/components/listing/EditorialImageManager";
import {
  ProductSuggestionCard,
  ProductCardSkeleton,
} from "./ProductSuggestionCard";

const SERIF = { fontFamily: "Georgia, 'Times New Roman', serif" } as const;
const SEARCH_DEBOUNCE_MS = 250;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ImageProductTagSidebarProps {
  listingId: string;
  selectedImage: EditorialImage | null;
  /** Tags for the currently selected image (existing + optimistic). */
  existingTags: EditorialProductTag[];
  onTagAdded: (tag: EditorialProductTag) => void;
  onTagsChange: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ImageProductTagSidebar({
  listingId,
  selectedImage,
  existingTags,
  onTagAdded,
  onTagsChange,
}: ImageProductTagSidebarProps) {
  // Suggestion state
  const [suggested, setSuggested] = useState<ScoredProduct[]>([]);
  const [altText, setAltText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScoredProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Optimistic mutation tracking
  const [taggingIds, setTaggingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Product IDs already tagged on this image
  const taggedProductIds = useMemo(
    () => new Set(existingTags.map((t) => t.product_id).filter(Boolean) as string[]),
    [existingTags]
  );

  // Tagged products with titles (for chip display)
  const taggedEntries = useMemo(
    () => existingTags.filter((t) => t.product_id && !removingIds.has(t.product_id)),
    [existingTags, removingIds]
  );

  // ── Fetch suggestions on image change ───────────────────────────────────

  useEffect(() => {
    if (!selectedImage) {
      setSuggested([]);
      setAltText(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setSearchQuery("");
    setSearchResults([]);

    getAltTextSuggestions({ listingImageId: selectedImage.listingImageId })
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setSuggested(res.data.suggested);
          setAltText(res.data.altText);
        } else {
          setSuggested([]);
          setAltText(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggested([]);
          setAltText(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedImage?.listingImageId]);

  // ── Tag a product ───────────────────────────────────────────────────────

  const handleTag = useCallback(
    async (product: ScoredProduct) => {
      if (!selectedImage) return;
      setTaggingIds((prev) => new Set(prev).add(product.id));
      try {
        const res = await addPhotoProductTagAction(
          selectedImage.listingImageId,
          listingId,
          product.id,
          0.5,
          0.5
        );
        if (res.data && !res.error) {
          const newTag: EditorialProductTag = {
            id: res.data.id,
            listing_image_id: selectedImage.listingImageId,
            product_id: product.id,
            x: 0.5,
            y: 0.5,
            product_title: product.title,
            product_slug: product.slug,
          };
          onTagAdded(newTag);
          setTimeout(() => onTagsChange(), 300);
        }
      } finally {
        setTaggingIds((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
      }
    },
    [selectedImage, listingId, onTagAdded, onTagsChange]
  );

  // ── Remove a tag ────────────────────────────────────────────────────────

  const handleRemove = useCallback(
    async (productId: string) => {
      const tag = existingTags.find((t) => t.product_id === productId);
      if (!tag) return;
      setRemovingIds((prev) => new Set(prev).add(productId));
      try {
        const res = await deleteTag(tag.id);
        if (res.ok) {
          onTagsChange();
        }
      } finally {
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [existingTags, onTagsChange]
  );

  // ── Debounced search ────────────────────────────────────────────────────

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (value.trim().length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const res = await searchProductsByText({ query: value });
          if (res.ok) setSearchResults(res.data ?? []);
          else setSearchResults([]);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  if (!selectedImage) return null;

  return (
    <div className="rounded-lg border border-zinc-100 bg-white p-4 space-y-4">
      <h3
        className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2"
        style={SERIF}
      >
        Product Suggestions
      </h3>

      {/* Alt text context */}
      {altText && (
        <div className="rounded bg-zinc-50 px-3 py-2">
          <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-0.5">
            Alt text
          </p>
          <p className="text-xs text-zinc-700 leading-relaxed line-clamp-3">
            {altText}
          </p>
        </div>
      )}

      {/* ── Tagged on this image ──────────────────────────────────────── */}
      {taggedEntries.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Tagged ({taggedEntries.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {taggedEntries.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] text-green-700"
              >
                <span className="max-w-[120px] truncate">
                  {tag.product_title ?? "Untitled"}
                </span>
                <button
                  type="button"
                  onClick={() => tag.product_id && handleRemove(tag.product_id)}
                  disabled={!!tag.product_id && removingIds.has(tag.product_id)}
                  className="ml-0.5 text-green-500 hover:text-red-600 disabled:opacity-40"
                  aria-label={`Remove ${tag.product_title ?? "tag"}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading skeletons ─────────────────────────────────────────── */}
      {loading && (
        <div>
          <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Suggested
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Suggestion grid ───────────────────────────────────────────── */}
      {!loading && suggested.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Suggested ({suggested.length})
          </h4>
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-0.5">
            {suggested.map((p) => (
              <ProductSuggestionCard
                key={p.id}
                product={p}
                isTagged={taggedProductIds.has(p.id)}
                tagging={taggingIds.has(p.id)}
                onTag={() => handleTag(p)}
                onRemove={() => handleRemove(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Empty states ──────────────────────────────────────────────── */}
      {!loading && suggested.length === 0 && !altText && (
        <p className="text-xs text-zinc-500 py-2">
          Add alt text in the SEO section above to get product suggestions.
        </p>
      )}
      {!loading && suggested.length === 0 && altText && (
        <p className="text-xs text-zinc-500 py-2">
          No product matches for this alt text. Try the search below.
        </p>
      )}

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div>
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Search products
        </h4>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or brand\u2026"
          className="w-full border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none"
        />

        {/* Search loading */}
        {searchLoading && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        )}

        {/* Search results */}
        {!searchLoading && searchResults.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-2 max-h-[320px] overflow-y-auto pr-0.5">
            {searchResults.map((p) => (
              <ProductSuggestionCard
                key={p.id}
                product={p}
                isTagged={taggedProductIds.has(p.id)}
                tagging={taggingIds.has(p.id)}
                onTag={() => handleTag(p)}
                onRemove={() => handleRemove(p.id)}
              />
            ))}
          </div>
        )}

        {/* Search empty */}
        {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-zinc-400 mt-2">No products found.</p>
        )}
      </div>
    </div>
  );
}

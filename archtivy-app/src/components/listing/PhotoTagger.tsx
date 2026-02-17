"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  addPhotoProductTagAction,
  searchProductsAction,
} from "@/app/actions/projectBrandsProducts";
import { searchSuggestedProducts, updateTag } from "@/app/actions/smartProductTagging";
import type { TagSuggestionProduct } from "@/app/actions/smartProductTagging";
import {
  PRODUCT_TAXONOMY,
  getCategoriesForType,
  getSubcategoriesForCategory,
} from "@/lib/taxonomy/productTaxonomy";

export interface PhotoTagRecord {
  id: string;
  listing_image_id: string;
  product_id: string;
  x: number;
  y: number;
}

/** Extended tag with optional admin metadata (for panel). */
export interface PhotoTagWithMeta extends PhotoTagRecord {
  product_type_id?: string | null;
  product_category_id?: string | null;
  product_subcategory_id?: string | null;
  color_text?: string | null;
  material_id?: string | null;
  feature_text?: string | null;
  product_title?: string;
  product_slug?: string;
}

export interface PhotoTaggerProps {
  listingId: string;
  listingImageId: string;
  imageUrl: string;
  imageAlt?: string;
  existingTags: PhotoTagRecord[];
  onTagAdded?: (tag: PhotoTagRecord) => void;
  onTagRemoved?: (tagId: string) => void;
  onPlaceTag?: (normX: number, normY: number) => void;
  onTagClick?: (tag: PhotoTagRecord) => void;
  brandProfileId?: string | null;
  disabled?: boolean;
  /** Optional material options for Tag Editor (admin). */
  materialOptions?: { id: string; display_name: string }[];
}

/**
 * Tagging UI is mounted via ImageProductTaggingBlock on:
 * - admin: src/app/(admin)/admin/projects/[id]/page.tsx
 * - public: src/app/(public)/projects/[slug]/page.tsx
 * If the "PhotoTagger LIVE" badge never appears, the page may be using a different component.
 */
const COLOR_OPTIONS = [
  "Black", "White", "Gray", "Silver", "Brown", "Beige", "Wood", "Natural",
  "Blue", "Green", "Red", "Yellow", "Orange", "Brass", "Copper", "Gold", "Chrome", "Other",
];

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function PhotoTagger({
  listingId,
  listingImageId,
  imageUrl,
  imageAlt = "",
  existingTags,
  onTagAdded,
  onPlaceTag,
  onTagClick,
  brandProfileId,
  disabled,
  materialOptions = [],
}: PhotoTaggerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<{ clientX: number; clientY: number; normX: number; normY: number } | null>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<{ id: string; title: string; slug: string | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Selection state
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [pendingNewTag, setPendingNewTag] = useState<PhotoTagRecord | null>(null);
  const tagsWithMeta = existingTags as PhotoTagWithMeta[];
  const selectedTagFromList = useMemo(
    () => (selectedTagId ? tagsWithMeta.find((t) => t.id === selectedTagId) : null),
    [selectedTagId, tagsWithMeta]
  );
  const selectedTag = selectedTagFromList ?? pendingNewTag;

  // After adding a tag from popover, auto-select it
  const handleTagAddedFromPopover = useCallback((tag: PhotoTagRecord) => {
    setPendingNewTag(tag);
    setSelectedTagId(tag.id);
    onTagAdded?.(tag);
  }, [onTagAdded]);

  const smartMode = Boolean(onPlaceTag);

  useEffect(() => {
    if (smartMode) return;
    const t = setTimeout(() => {
      if (!popover) return;
      setLoading(true);
      searchProductsAction(query, brandProfileId ?? undefined).then((res) => {
        setProducts(res.data ?? []);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, popover, brandProfileId, smartMode]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      console.log("[PhotoTagger] image click", { disabled, onPlaceTag: !!onPlaceTag });
      if (disabled) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;
      if (onPlaceTag) {
        onPlaceTag(normX, normY);
        return;
      }
      setPopover({ clientX: e.clientX, clientY: e.clientY, normX, normY });
      setQuery("");
      setProducts([]);
    },
    [disabled, onPlaceTag]
  );

  // Debug: confirm this component is the one rendering (if badge never shows, tagging UI may be another component)
  console.log("PhotoTagger RENDERED");

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
      const newTag: PhotoTagRecord = {
        id: res.data!.id,
        listing_image_id: listingImageId,
        product_id: productId,
        x: normX,
        y: normY,
      };
      handleTagAddedFromPopover(newTag);
    },
    [listingId, listingImageId, popover, handleTagAddedFromPopover]
  );

  return (
    <div className="flex w-full max-w-full flex-col gap-4 md:flex-row">
      {/* Debug: if this badge never appears, the tagging UI is rendered by another component (e.g. check ImageProductTaggingBlock usage). */}
      <div
        className="fixed bottom-4 right-4 z-[9999] rounded bg-red-600 px-2 py-1 text-xs font-bold text-white shadow"
        aria-hidden
      >
        PhotoTagger LIVE
      </div>
      {/* Left column: image + hotspot overlay */}
      <div ref={containerRef} className="relative min-w-0 flex-1">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleImageClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleImageClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }}
          className={`relative cursor-crosshair overflow-visible rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 ${
            disabled ? "cursor-not-allowed opacity-70" : ""
          }`}
        >
          <div className="relative z-0 overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAlt}
              className="block max-h-64 w-full object-contain"
            />
          </div>
          {/* Hotspot overlay: z-10 above image. Container has pointer-events-none so image click works; each hotspot is pointer-events-auto and calls setSelectedTagId on click. */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg" aria-hidden>
            {existingTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("[PhotoTagger] hotspot click", { tagId: t.id });
                  setSelectedTagId(t.id);
                  setPendingNewTag(null);
                  onTagClick?.(t);
                }}
                className={`pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 bg-white text-xs font-medium transition hover:scale-110 dark:bg-zinc-900 ${
                  selectedTagId === t.id
                    ? "border-[#002abf] text-[#002abf]"
                    : "border-archtivy-primary text-archtivy-primary"
                }`}
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
                title="Edit tag"
              />
            ))}
          </div>
        </div>

        {popover && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={() => setPopover(null)} />
            <div
              className="fixed z-20 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                left: Math.min(popover.clientX, typeof window !== "undefined" ? window.innerWidth - 300 : popover.clientX),
                top: popover.clientY + 8,
              }}
            >
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Add product tag</p>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products…"
                className={inputClass}
                autoFocus
              />
              <div className="mt-2 max-h-40 overflow-auto">
                {loading && <p className="py-2 text-center text-sm text-zinc-500">Loading…</p>}
                {!loading &&
                  products.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      disabled={adding}
                      onClick={() => {
                        console.log("[PhotoTagger] popover product click", { productId: p.id, title: p.title });
                        addTag(p.id);
                      }}
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

      {/* Right column: Tag Editor Panel (admin-only) */}
      <div className="w-full shrink-0 md:w-80">
        <TagEditorPanelInner
          selectedTag={selectedTag}
          listingId={listingId}
          materialOptions={materialOptions}
          onClearSelection={() => {
            setSelectedTagId(null);
            setPendingNewTag(null);
          }}
        />
      </div>
    </div>
  );
}

// --- Tag Editor Panel: 4 filters + search + visual results ---

interface TagEditorPanelInnerProps {
  selectedTag: PhotoTagWithMeta | null;
  listingId: string;
  materialOptions: { id: string; display_name: string }[];
  onClearSelection: () => void;
}

function TagEditorPanelInner({
  selectedTag,
  listingId,
  materialOptions,
  onClearSelection,
}: TagEditorPanelInnerProps) {
  const [typeId, setTypeId] = useState(selectedTag?.product_type_id ?? "");
  const [category, setCategory] = useState(selectedTag?.product_category_id ?? "");
  const [subcategory, setSubcategory] = useState(selectedTag?.product_subcategory_id ?? "");
  const [color, setColor] = useState(selectedTag?.color_text ?? "");
  const [materialId, setMaterialId] = useState(selectedTag?.material_id ?? "");
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<TagSuggestionProduct[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [linkingProduct, setLinkingProduct] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState<TagSuggestionProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => getCategoriesForType(typeId), [typeId]);
  const subcategories = useMemo(() => getSubcategoriesForCategory(typeId, category), [typeId, category]);

  useEffect(() => {
    if (!typeId) setCategory("");
  }, [typeId]);
  useEffect(() => {
    if (!category) setSubcategory("");
  }, [category]);

  useEffect(() => {
    setTypeId(selectedTag?.product_type_id ?? "");
    setCategory(selectedTag?.product_category_id ?? "");
    setSubcategory(selectedTag?.product_subcategory_id ?? "");
    setColor(selectedTag?.color_text ?? "");
    setMaterialId(selectedTag?.material_id ?? "");
    setLinkedProduct(null);
  }, [selectedTag?.id]);

  const debouncedTypeId = useDebounce(typeId, 150);
  const debouncedCategory = useDebounce(category, 200);
  const debouncedSubcategory = useDebounce(subcategory, 200);
  const debouncedColor = useDebounce(color, 200);
  const debouncedMaterialId = useDebounce(materialId, 200);
  const debouncedQueryText = useDebounce(queryText, 280);

  useEffect(() => {
    if (!selectedTag?.id) {
      setResults([]);
      return;
    }
    const hasQuery = Boolean(debouncedQueryText.trim());
    const hasFilter =
      Boolean(debouncedTypeId.trim()) ||
      Boolean(debouncedCategory.trim()) ||
      Boolean(debouncedSubcategory.trim()) ||
      Boolean(debouncedColor.trim()) ||
      Boolean(debouncedMaterialId.trim());
    if (!hasQuery && !hasFilter) {
      setResults([]);
      return;
    }
    setResultsLoading(true);
    searchSuggestedProducts({
      typeId: debouncedTypeId.trim() || null,
      categoryId: debouncedCategory.trim() || null,
      subcategoryId: debouncedSubcategory.trim() || null,
      colorText: debouncedColor.trim() || null,
      materialId: debouncedMaterialId.trim() || null,
      queryText: debouncedQueryText.trim() || null,
    })
      .then((res) => {
        setResultsLoading(false);
        if (res.ok && res.data) setResults(res.data);
        else setResults([]);
      })
      .catch(() => {
        setResultsLoading(false);
        setResults([]);
      });
  }, [selectedTag?.id, debouncedTypeId, debouncedCategory, debouncedSubcategory, debouncedColor, debouncedMaterialId, debouncedQueryText]);

  const handleSelectResult = useCallback(
    async (product: TagSuggestionProduct) => {
      if (!selectedTag?.id) return;
      setLinkingProduct(true);
      setError(null);
      const res = await updateTag(selectedTag.id, listingId, {
        product_id: product.id,
        product_type_id: typeId.trim() || null,
        product_category_id: category.trim() || null,
        product_subcategory_id: subcategory.trim() || null,
        color_text: color.trim() || null,
        material_id: materialId.trim() || null,
      });
      setLinkingProduct(false);
      if (!res.ok) setError(res.error ?? "Failed to link product");
      else setLinkedProduct(product);
    },
    [selectedTag?.id, listingId, typeId, category, subcategory, color, materialId]
  );

  const displayLinkedProduct =
    linkedProduct ??
    (selectedTag?.product_id
      ? ({ id: selectedTag.product_id, title: selectedTag.product_title ?? null, slug: null, cover_image_url: null, brand_name: null } as TagSuggestionProduct)
      : null);

  if (!selectedTag) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Select a hotspot to edit.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Tag Editor</h3>
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Linked product</h4>
          {displayLinkedProduct ? (
            <div className="flex items-center gap-3 rounded-lg border border-[#002abf]/20 bg-[#002abf]/5 p-2 dark:bg-[#002abf]/10">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                {displayLinkedProduct.cover_image_url ? (
                  <Image src={displayLinkedProduct.cover_image_url} alt="" fill className="object-cover" unoptimized sizes="56px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{displayLinkedProduct.title ?? "Untitled"}</p>
                {displayLinkedProduct.brand_name && <p className="truncate text-xs text-zinc-500">by {displayLinkedProduct.brand_name}</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No product linked. Search and pick one below.</p>
          )}
        </div>

        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Type</label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputClass}>
            <option value="">Any</option>
            {PRODUCT_TAXONOMY.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} disabled={!typeId}>
            <option value="">Any</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Subcategory</label>
          <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={inputClass} disabled={!category}>
            <option value="">Any</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Color</label>
          <select value={color} onChange={(e) => setColor(e.target.value)} className={inputClass}>
            <option value="">Any</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Material</label>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputClass}>
            <option value="">Any</option>
            {materialOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Search product name / brand…</label>
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search product name / brand…"
            className={inputClass}
          />
        </div>

        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Results</h4>
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {resultsLoading && (
            <ul className="space-y-2">
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                  <div className="h-14 w-14 shrink-0 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!resultsLoading && results.length === 0 && (
            <p className="text-sm text-zinc-500">Select category/subcategory or type in search to see results.</p>
          )}
          {!resultsLoading &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={linkingProduct}
                onClick={() => handleSelectResult(p)}
                className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-2 text-left transition hover:border-[#002abf] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-700">
                  {p.cover_image_url ? (
                    <Image src={p.cover_image_url} alt="" fill className="object-cover" unoptimized sizes="56px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{p.title ?? "Untitled"}</span>
                  <span className="block truncate text-xs text-zinc-500">{p.brand_name ? `by ${p.brand_name}` : "—"}</span>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

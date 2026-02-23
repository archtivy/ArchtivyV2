"use client";

import * as React from "react";
import Image from "next/image";
import {
  updateTag,
  deleteTag,
  searchSuggestedProducts,
  type TagSuggestionProduct,
} from "@/app/actions/smartProductTagging";
import { searchProductsAction } from "@/app/actions/projectBrandsProducts";
import { useDebounce } from "@/components/hooks/useDebounce";
import {
  PRODUCT_TAXONOMY,
  getCategoriesForType,
  getSubcategoriesForCategory,
} from "@/lib/taxonomy/productTaxonomy";
import { VisualSuggestionsList } from "./VisualSuggestionsList";

const COLOR_OPTIONS = [
  "Black", "White", "Gray", "Silver", "Brown", "Beige", "Wood", "Natural",
  "Blue", "Green", "Red", "Yellow", "Orange", "Brass", "Copper", "Gold", "Chrome", "Other",
];

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

export interface LinkedProductDisplay {
  id: string;
  title: string;
  slug: string | null;
  brand_name?: string | null;
  cover_image_url?: string | null;
}

export interface TagEditorPanelProps {
  tagId: string;
  listingId: string;
  initial: {
    product_id: string | null;
    product_type_id: string | null;
    product_category_id: string | null;
    product_subcategory_id: string | null;
    category_text?: string | null;
    color_text: string | null;
    material_id: string | null;
    feature_text: string | null;
  };
  linkedProduct: LinkedProductDisplay | null;
  materialOptions: { id: string; display_name: string }[];
  onClose: () => void;
  /** Called after save or after linking a product. Pass linked product when linking so panel can show it without closing. */
  onSaved: (linkedProduct?: LinkedProductDisplay) => void;
  onDeleted?: () => void;
}

export function TagEditorPanel({
  tagId,
  listingId,
  initial,
  linkedProduct,
  materialOptions,
  onClose,
  onSaved,
  onDeleted,
}: TagEditorPanelProps) {
  const [typeId, setTypeId] = React.useState(initial.product_type_id ?? "");
  const [categoryId, setCategoryId] = React.useState(initial.product_category_id ?? "");
  const [subcategoryId, setSubcategoryId] = React.useState(initial.product_subcategory_id ?? "");
  const [color, setColor] = React.useState(initial.color_text ?? "");
  const [customColor, setCustomColor] = React.useState(
    initial.color_text && !COLOR_OPTIONS.includes(initial.color_text) ? initial.color_text : ""
  );
  const [materialId, setMaterialId] = React.useState(initial.material_id ?? "");
  const [feature, setFeature] = React.useState(initial.feature_text ?? "");
  const [suggestionSearch, setSuggestionSearch] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<TagSuggestionProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultsError, setResultsError] = React.useState<string | null>(null);

  const [changeProductOpen, setChangeProductOpen] = React.useState(false);
  const [productSearchQuery, setProductSearchQuery] = React.useState("");
  const [productSearchResults, setProductSearchResults] = React.useState<{ id: string; title: string; slug: string | null }[]>([]);
  const [productSearchLoading, setProductSearchLoading] = React.useState(false);

  const categories = React.useMemo(() => getCategoriesForType(typeId), [typeId]);
  const subcategories = React.useMemo(() => getSubcategoriesForCategory(typeId, categoryId), [typeId, categoryId]);

  React.useEffect(() => {
    if (!typeId) setCategoryId("");
  }, [typeId]);
  React.useEffect(() => {
    if (!categoryId) setSubcategoryId("");
  }, [categoryId]);

  const debouncedTypeId = useDebounce(typeId, 150);
  const debouncedCategoryId = useDebounce(categoryId, 150);
  const debouncedSubcategoryId = useDebounce(subcategoryId, 150);
  const debouncedColor = useDebounce(color === "Other" ? customColor : color, 150);
  const debouncedMaterialId = useDebounce(materialId, 150);
  const debouncedFeature = useDebounce(feature, 200);
  const debouncedSuggestionSearch = useDebounce(suggestionSearch, 200);
  const debouncedProductQuery = useDebounce(productSearchQuery, 200);

  React.useEffect(() => {
    if (!changeProductOpen) return;
    setProductSearchLoading(true);
    searchProductsAction(debouncedProductQuery, undefined).then((res) => {
      setProductSearchResults(res.data ?? []);
      setProductSearchLoading(false);
    });
  }, [changeProductOpen, debouncedProductQuery]);

  React.useEffect(() => {
    const hasQuery = Boolean(debouncedSuggestionSearch?.trim());
    const hasFilter =
      Boolean(debouncedTypeId?.trim()) ||
      Boolean(debouncedCategoryId?.trim()) ||
      Boolean(debouncedSubcategoryId?.trim()) ||
      Boolean(debouncedColor?.trim()) ||
      Boolean(debouncedMaterialId?.trim()) ||
      Boolean(debouncedFeature?.trim());
    if (!hasQuery && !hasFilter) {
      setSuggestions([]);
      setResultsError(null);
      return;
    }
    setLoading(true);
    setResultsError(null);
    const featureText = debouncedFeature?.trim() || null;
    searchSuggestedProducts({
      typeId: debouncedTypeId?.trim() || null,
      categoryId: debouncedCategoryId?.trim() || null,
      subcategoryId: debouncedSubcategoryId?.trim() || null,
      colorText: debouncedColor?.trim() || null,
      materialId: debouncedMaterialId?.trim() || null,
      featureText,
      queryText: debouncedSuggestionSearch?.trim() || null,
    }).then((res) => {
      setLoading(false);
      if (res.ok && res.data) {
        setSuggestions(res.data);
        setResultsError(null);
      } else {
        setSuggestions([]);
        const err = res.ok === false ? (res.error ?? "Failed to load results") : "Failed to load results";
        setResultsError(err);
        console.error("[TagEditorPanel] searchSuggestedProducts failed:", err);
      }
    });
  }, [debouncedTypeId, debouncedCategoryId, debouncedSubcategoryId, debouncedColor, debouncedMaterialId, debouncedFeature, debouncedSuggestionSearch]);

  const colorValue = color === "Other" ? customColor.trim() : color;

  const saveFields = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    const res = await updateTag(tagId, listingId, {
      product_type_id: typeId.trim() || null,
      product_category_id: categoryId.trim() || null,
      product_subcategory_id: subcategoryId.trim() || null,
      color_text: colorValue || null,
      material_id: materialId.trim() || null,
      feature_text: feature.trim() || null,
    });
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Failed to save");
    else onSaved();
  }, [tagId, listingId, typeId, categoryId, subcategoryId, colorValue, materialId, feature, onSaved]);

  const selectProduct = React.useCallback(
    async (productId: string, productDisplay?: TagSuggestionProduct) => {
      setSaving(true);
      setError(null);
      const res = await updateTag(tagId, listingId, {
        product_id: productId,
        product_type_id: typeId.trim() || null,
        product_category_id: categoryId.trim() || null,
        product_subcategory_id: subcategoryId.trim() || null,
        color_text: colorValue || null,
        material_id: materialId.trim() || null,
        feature_text: feature.trim() || null,
      });
      setSaving(false);
      if (!res.ok) setError(res.error ?? "Failed to link product");
      else {
        setChangeProductOpen(false);
        setProductSearchQuery("");
        const linked: LinkedProductDisplay | undefined = productDisplay
          ? {
              id: productDisplay.id,
              title: productDisplay.title ?? "",
              slug: productDisplay.slug ?? null,
              brand_name: productDisplay.brand_name ?? null,
              cover_image_url: productDisplay.cover_image_url ?? null,
            }
          : undefined;
        onSaved(linked);
      }
    },
    [tagId, listingId, typeId, categoryId, subcategoryId, colorValue, materialId, feature, onSaved]
  );

  const hasAnyFilter = Boolean(typeId || categoryId || subcategoryId || debouncedSuggestionSearch?.trim());
  const canSave = typeId && categoryId && subcategoryId && colorValue && materialId;

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Tag Editor</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        {linkedProduct && (
          <div className="rounded-lg border border-[#002abf] bg-[#002abf]/5 p-3 dark:bg-[#002abf]/10">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#002abf]">Selected product</p>
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
                {linkedProduct.cover_image_url ? (
                  <Image
                    src={linkedProduct.cover_image_url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={linkedProduct.cover_image_url.startsWith("http")}
                    sizes="56px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                  {linkedProduct.title || "Untitled"}
                </p>
                {linkedProduct.brand_name && (
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">by {linkedProduct.brand_name}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setChangeProductOpen(true)}
              className="mt-2 w-full rounded border border-zinc-300 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Change product
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Product type <span className="text-red-500">*</span>
          </label>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={inputClass}>
            <option value="">Select type</option>
            {PRODUCT_TAXONOMY.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Product category <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
            disabled={!typeId}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Product subcategory <span className="text-red-500">*</span>
          </label>
          <select
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
            className={inputClass}
            disabled={!categoryId}
          >
            <option value="">Select subcategory</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Color <span className="text-red-500">*</span>
          </label>
          <select value={color} onChange={(e) => setColor(e.target.value)} className={inputClass}>
            <option value="">Select color</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {color === "Other" && (
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="Enter color"
              className={`mt-2 ${inputClass}`}
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Material <span className="text-red-500">*</span>
          </label>
          <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputClass}>
            <option value="">Select material</option>
            {materialOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Feature (optional)
          </label>
          <input
            type="text"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            placeholder="e.g. curved edge"
            className={inputClass}
          />
        </div>

        <button
          type="button"
          onClick={saveFields}
          disabled={saving || !canSave}
          className="w-full rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#0022a0] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save metadata"}
        </button>
        {onDeleted && (
          <button
            type="button"
            onClick={async () => {
              setSaving(true);
              const res = await deleteTag(tagId);
              setSaving(false);
              if (res.ok) onDeleted();
            }}
            disabled={saving}
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Delete tag
          </button>
        )}

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Results
        </h4>
        {!hasAnyFilter ? (
          <p className="text-sm text-zinc-500">Select category/subcategory or type in search to see results.</p>
        ) : (
          <>
            {resultsError && (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {resultsError}
              </p>
            )}
            <VisualSuggestionsList
              products={suggestions}
              loading={loading}
              searchQuery={suggestionSearch}
              onSearchQueryChange={setSuggestionSearch}
              onSelectProduct={(id) => selectProduct(id, suggestions.find((s) => s.id === id))}
              selecting={saving}
              limit={12}
              thumbSize={56}
            />
          </>
        )}

        {!linkedProduct && (
          <>
            <p className="text-xs text-zinc-500">Or pick from simple search:</p>
            <button
              type="button"
              onClick={() => setChangeProductOpen(true)}
              className="w-full rounded border border-dashed border-zinc-300 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Search all products…
            </button>
          </>
        )}

        {changeProductOpen && (
          <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Search products</p>
            <input
              type="text"
              value={productSearchQuery}
              onChange={(e) => setProductSearchQuery(e.target.value)}
              placeholder="Search products…"
              className={inputClass}
              autoFocus
            />
            <div className="mt-2 max-h-40 overflow-auto">
              {productSearchLoading && <p className="py-2 text-center text-sm text-zinc-500">Loading…</p>}
              {!productSearchLoading &&
                productSearchResults.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={saving}
                    onClick={() => selectProduct(p.id)}
                    className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {p.title}
                  </button>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setChangeProductOpen(false)}
              className="mt-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

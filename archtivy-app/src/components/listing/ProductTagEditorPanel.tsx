"use client";

import * as React from "react";
import Image from "next/image";
import {
  updateTag,
  deleteTag,
  searchSuggestedProducts,
  type TagSuggestionProduct,
} from "@/app/actions/smartProductTagging";
import { useDebounce } from "@/components/hooks/useDebounce";
const COLOR_OPTIONS = [
  "Black", "White", "Gray", "Silver", "Brown", "Beige", "Wood", "Natural",
  "Blue", "Green", "Red", "Yellow", "Orange", "Brass", "Copper", "Gold", "Chrome", "Other",
];

export interface ProductTagEditorPanelProps {
  tagId: string;
  listingId: string;
  initial: {
    product_id: string | null;
    category_text: string | null;
    color_text: string | null;
    material_id: string | null;
    feature_text: string | null;
  };
  categoryOptions: string[];
  materialOptions: { id: string; display_name: string }[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export function ProductTagEditorPanel({
  tagId,
  listingId,
  initial,
  categoryOptions,
  materialOptions,
  onClose,
  onSaved,
  onDeleted,
}: ProductTagEditorPanelProps) {
  const [category, setCategory] = React.useState(initial.category_text ?? "");
  const [color, setColor] = React.useState(initial.color_text ?? "");
  const [materialId, setMaterialId] = React.useState(initial.material_id ?? "");
  const [feature, setFeature] = React.useState(initial.feature_text ?? "");
  const [manualSearch, setManualSearch] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<TagSuggestionProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const debouncedCategory = useDebounce(category, 200);
  const debouncedColor = useDebounce(color, 200);
  const debouncedFeature = useDebounce(feature, 200);
  const debouncedManual = useDebounce(manualSearch, 300);

  React.useEffect(() => {
    if (!category.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    searchSuggestedProducts({
      categoryText: debouncedCategory.trim() || null,
      colorText: debouncedColor.trim() || null,
      materialId: materialId.trim() || null,
      featureQuery: debouncedFeature.trim() || debouncedManual.trim() || null,
    }).then((res) => {
      setLoading(false);
      if (res.ok && res.data) setSuggestions(res.data);
      else setSuggestions([]);
    });
  }, [debouncedCategory, debouncedColor, debouncedFeature, debouncedManual, materialId]);

  const saveFields = React.useCallback(async () => {
    setSaving(true);
    setError(null);
    const res = await updateTag(tagId, listingId, {
      category_text: category.trim() || null,
      color_text: color.trim() || null,
      material_id: materialId.trim() || null,
      feature_text: feature.trim() || null,
    });
    setSaving(false);
    if (!res.ok) setError(res.error ?? "Failed to save");
    else onSaved();
  }, [tagId, listingId, category, color, materialId, feature, onSaved]);

  const selectProduct = React.useCallback(
    async (productId: string) => {
      setSaving(true);
      setError(null);
      const res = await updateTag(tagId, listingId, {
        product_id: productId,
        category_text: category.trim() || null,
        color_text: color.trim() || null,
        material_id: materialId.trim() || null,
        feature_text: feature.trim() || null,
      });
      setSaving(false);
      if (!res.ok) setError(res.error ?? "Failed to link product");
      else onSaved();
    },
    [tagId, listingId, category, color, materialId, feature, onSaved]
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Product Tag Editor</h3>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Product Category <span className="text-red-500">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            style={{ borderRadius: "4px" }}
          >
            <option value="">Select category</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Color <span className="text-red-500">*</span>
          </label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            style={{ borderRadius: "4px" }}
          >
            <option value="">Select color</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Material <span className="text-red-500">*</span>
          </label>
          <select
            value={materialId}
            onChange={(e) => setMaterialId(e.target.value)}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            style={{ borderRadius: "4px" }}
          >
            <option value="">Select material</option>
            {materialOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Distinct feature (optional)
          </label>
          <input
            type="text"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            placeholder="e.g. curved edge"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            style={{ borderRadius: "4px" }}
          />
        </div>
        <button
          type="button"
          onClick={saveFields}
          disabled={saving || !category.trim() || !color.trim() || !materialId}
          className="w-full rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#0022a0] disabled:opacity-50"
          style={{ borderRadius: "4px" }}
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
            style={{ borderRadius: "4px" }}
          >
            Delete tag
          </button>
        )}

        <hr className="border-zinc-200 dark:border-zinc-700" />

        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Suggested Products
        </h4>
        {!category.trim() ? (
          <p className="text-sm text-zinc-500">Set category to see suggestions.</p>
        ) : (
          <>
            <input
              type="text"
              value={manualSearch}
              onChange={(e) => setManualSearch(e.target.value)}
              placeholder="Search any product…"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              style={{ borderRadius: "4px" }}
            />
            {loading && <p className="text-sm text-zinc-500">Loading…</p>}
            {!loading && suggestions.length === 0 && (
              <p className="text-sm text-zinc-500">No exact match. Try clearing feature or use search above.</p>
            )}
            <ul className="space-y-2">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectProduct(p.id)}
                    className="flex w-full items-center gap-3 rounded border border-zinc-200 p-2 text-left transition hover:border-[#002abf] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    style={{ borderRadius: "4px" }}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-700">
                      {p.cover_image_url ? (
                        <Image
                          src={p.cover_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={p.cover_image_url.startsWith("http")}
                          sizes="48px"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">—</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {p.title ?? "Untitled"}
                      </span>
                      {p.brand_name && (
                        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{p.brand_name}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

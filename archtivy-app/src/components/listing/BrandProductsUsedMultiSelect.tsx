"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  searchProductsAction,
  setProjectProductsManualAction,
} from "@/app/actions/projectBrandsProducts";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

export interface BrandProductsUsedMultiSelectProps {
  projectId: string;
  /** Optional: only show products from this brand (owner_profile_id). */
  brandProfileId?: string | null;
  initialProductIds: string[];
  label?: string;
  disabled?: boolean;
}

interface ProductOption {
  id: string;
  title: string;
  slug: string | null;
}

export function BrandProductsUsedMultiSelect({
  projectId,
  brandProfileId,
  initialProductIds,
  label = "Products used (optional)",
  disabled,
}: BrandProductsUsedMultiSelectProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialProductIds);
  const [selectedTitles, setSelectedTitles] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!open) {
        setOptions([]);
        return;
      }
      setLoading(true);
      searchProductsAction(query, brandProfileId ?? undefined).then((res) => {
        setOptions(res.data ?? []);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, brandProfileId]);

  useEffect(() => {
    const onBlur = () => setTimeout(() => setOpen(false), 150);
    const el = containerRef.current;
    el?.addEventListener("focusout", onBlur);
    return () => el?.removeEventListener("focusout", onBlur);
  }, []);

  const addProduct = useCallback(
    (p: ProductOption) => {
      if (selectedIds.includes(p.id)) return;
      const next = [...selectedIds, p.id];
      setSelectedIds(next);
      setSelectedTitles((prev) => ({ ...prev, [p.id]: p.title }));
      setQuery("");
      setOpen(false);
      setSaving(true);
      setProjectProductsManualAction(projectId, next).finally(() => setSaving(false));
    },
    [projectId, selectedIds]
  );

  const removeProduct = useCallback(
    (id: string) => {
      const next = selectedIds.filter((x) => x !== id);
      setSelectedIds(next);
      setSelectedTitles((prev) => {
        const u = { ...prev };
        delete u[id];
        return u;
      });
      setSaving(true);
      setProjectProductsManualAction(projectId, next).finally(() => setSaving(false));
    },
    [projectId, selectedIds]
  );

  const filtered = options.filter((o) => !selectedIds.includes(o.id));

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={brandProfileId ? "Search this brand's products…" : "Search products…"}
          disabled={disabled}
          className={inputClass}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {open && (
          <div
            className="absolute top-full left-0 z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="listbox"
          >
            {loading && (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-zinc-500">
                No products found.
              </div>
            )}
            {!loading &&
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  onClick={() => addProduct(p)}
                  className="w-full px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {p.title}
                </button>
              ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <span>{selectedTitles[id] ?? id}</span>
            <button
              type="button"
              onClick={() => removeProduct(id)}
              disabled={disabled || saving}
              className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              aria-label={`Remove ${selectedTitles[id] ?? id}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {saving && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Saving…</p>
      )}
    </div>
  );
}

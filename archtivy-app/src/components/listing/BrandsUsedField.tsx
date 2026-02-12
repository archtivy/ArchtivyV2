"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  getProjectBrandIdsAction,
  setProjectBrandsAction,
  searchBrandsAction,
} from "@/app/actions/projectBrandsProducts";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";

export interface BrandsUsedFieldProps {
  projectId: string;
  initialBrandIds: string[];
  label?: string;
  disabled?: boolean;
}

interface BrandOption {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function BrandsUsedField({
  projectId,
  initialBrandIds,
  label = "Brands used (optional)",
  disabled,
}: BrandsUsedFieldProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialBrandIds);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadInitialLabels = useCallback(async () => {
    if (initialBrandIds.length === 0) return;
    const res = await searchBrandsAction("", 100);
    if (!res.data) return;
    const map: Record<string, string> = {};
    res.data.forEach((p) => {
      map[p.id] = (p.display_name || p.username || p.id).trim();
    });
    setSelectedLabels((prev) => ({ ...prev, ...map }));
  }, [initialBrandIds.join(",")]);

  useEffect(() => {
    loadInitialLabels();
  }, [loadInitialLabels]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!open && query.length === 0) {
        setOptions([]);
        return;
      }
      setLoading(true);
      searchBrandsAction(query, 20).then((res) => {
        setOptions(res.data ?? []);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  useEffect(() => {
    const onBlur = () => setTimeout(() => setOpen(false), 150);
    const el = containerRef.current;
    el?.addEventListener("focusout", onBlur);
    return () => el?.removeEventListener("focusout", onBlur);
  }, []);

  const addBrand = useCallback(
    (b: BrandOption) => {
      if (selectedIds.includes(b.id)) return;
      const next = [...selectedIds, b.id];
      setSelectedIds(next);
      setSelectedLabels((prev) => ({
        ...prev,
        [b.id]: (b.display_name || b.username || b.id).trim(),
      }));
      setQuery("");
      setOpen(false);
      setSaving(true);
      setProjectBrandsAction(projectId, next).finally(() => setSaving(false));
    },
    [projectId, selectedIds]
  );

  const removeBrand = useCallback(
    (id: string) => {
      const next = selectedIds.filter((x) => x !== id);
      setSelectedIds(next);
      setSelectedLabels((prev) => {
        const u = { ...prev };
        delete u[id];
        return u;
      });
      setSaving(true);
      setProjectBrandsAction(projectId, next).finally(() => setSaving(false));
    },
    [projectId, selectedIds]
  );

  const filtered = options.filter((o) => !selectedIds.includes(o.id));

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </label>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Search and select brands featured in this project.
      </p>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search brands..."
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
                No brands found.
              </div>
            )}
            {!loading &&
              filtered.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  onClick={() => addBrand(b)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {b.avatar_url ? (
                    <Image
                      src={b.avatar_url}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs dark:bg-zinc-700">
                      {(b.display_name || b.username || "?")[0]?.toUpperCase()}
                    </span>
                  )}
                  <span>{b.display_name || b.username || b.id}</span>
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
            <span>{selectedLabels[id] ?? id}</span>
            <button
              type="button"
              onClick={() => removeBrand(id)}
              disabled={disabled || saving}
              className="rounded-full p-0.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              aria-label={`Remove ${selectedLabels[id] ?? id}`}
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

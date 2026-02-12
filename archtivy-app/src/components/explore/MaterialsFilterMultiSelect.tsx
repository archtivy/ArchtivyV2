"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface MaterialsFilterOption {
  slug: string;
  display_name: string;
}

export interface MaterialsFilterMultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MaterialsFilterOption[];
  selectedSlugs: string[];
  onChange: (slugs: string[]) => void;
  disabled?: boolean;
}

export function MaterialsFilterMultiSelect({
  label = "Materials",
  placeholder = "Select materials…",
  options,
  selectedSlugs,
  onChange,
  disabled,
}: MaterialsFilterMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(selectedSlugs), [selectedSlugs]);
  const bySlug = useMemo(() => {
    const map = new Map<string, MaterialsFilterOption>();
    for (const o of options) map.set(o.slug, o);
    return map;
  }, [options]);

  const selectedOptions = useMemo(
    () => selectedSlugs.map((s) => bySlug.get(s)).filter(Boolean) as MaterialsFilterOption[],
    [selectedSlugs, bySlug]
  );

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = options;
    if (!q) return base;
    return base.filter((o) => o.display_name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    // let state update before focusing
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const toggle = useCallback(
    (slug: string) => {
      const next = selectedSet.has(slug)
        ? selectedSlugs.filter((s) => s !== slug)
        : [...selectedSlugs, slug];
      onChange(next);
    },
    [selectedSet, selectedSlugs, onChange]
  );

  const remove = useCallback(
    (slug: string) => {
      onChange(selectedSlugs.filter((s) => s !== slug));
    },
    [selectedSlugs, onChange]
  );

  const showNoResults = query.trim() !== "" && filteredOptions.length === 0;

  return (
    <div className="space-y-2" ref={containerRef}>
      {label ? (
        <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={open}
          disabled={disabled}
          className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.slug}
                className="flex items-center gap-1 rounded-full bg-archtivy-primary/10 px-3 py-1 text-xs font-medium text-archtivy-primary dark:bg-archtivy-primary/20"
              >
                {opt.display_name}
                <span className="sr-only">, selected</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(opt.slug);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(opt.slug);
                    }
                  }}
                  className="ml-1 rounded-full px-1 text-archtivy-primary hover:bg-archtivy-primary/20"
                  aria-label={`Remove ${opt.display_name}`}
                >
                  ×
                </span>
              </span>
            ))
          ) : (
            <span className="text-zinc-500 dark:text-zinc-400">{placeholder}</span>
          )}

          <span className="ml-auto text-zinc-400 dark:text-zinc-500" aria-hidden>
            ▾
          </span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <div className="p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search materials…"
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <ul className="max-h-56 overflow-auto py-1" role="listbox">
              {showNoResults ? (
                <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No results</li>
              ) : (
                filteredOptions.map((opt) => {
                  const active = selectedSet.has(opt.slug);
                  return (
                    <li key={opt.slug} role="option" aria-selected={active}>
                      <button
                        type="button"
                        onClick={() => toggle(opt.slug)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                              active
                                ? "border-archtivy-primary bg-archtivy-primary text-white"
                                : "border-zinc-300 bg-transparent dark:border-zinc-600"
                            }`}
                            aria-hidden
                          >
                            {active ? "✓" : ""}
                          </span>
                          <span>{opt.display_name}</span>
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{opt.slug}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


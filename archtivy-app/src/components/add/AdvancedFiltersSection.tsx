"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─── Types (minimal serializable shapes passed from server) ─────────────────

export interface MaterialNodeForForm {
  id: string;
  parent_id: string | null;
  depth: number;
  label: string;
}

export interface FacetValueForForm {
  id: string;
  slug: string;
  label: string;
}

export interface FacetForForm {
  id: string;
  slug: string;
  label: string;
  values: FacetValueForForm[];
}

// ─── Shared styles ──────────────────────────────────────────────────────────

const sectionClass =
  "space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/50";
const labelClass =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400";
const triggerClass =
  "flex w-full min-h-[42px] items-center gap-2 rounded border border-zinc-200 bg-white px-3 py-2 text-left text-sm transition hover:border-zinc-300 focus:border-[#002abf]/40 focus:outline-none focus:ring-1 focus:ring-[#002abf]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:text-zinc-100";

// ─── Component ──────────────────────────────────────────────────────────────

export interface AdvancedFiltersSectionProps {
  materialNodes: MaterialNodeForForm[];
  selectedMaterialNodeIds: string[];
  onMaterialNodeIdsChange: (ids: string[]) => void;
  facets: FacetForForm[];
  selectedFacetValueIds: string[];
  onFacetValueIdsChange: (ids: string[]) => void;
}

export function AdvancedFiltersSection({
  materialNodes,
  selectedMaterialNodeIds,
  onMaterialNodeIdsChange,
  facets,
  selectedFacetValueIds,
  onFacetValueIdsChange,
}: AdvancedFiltersSectionProps) {
  const hasContent = materialNodes.length > 0 || facets.length > 0;
  if (!hasContent) return null;

  return (
    <section className={sectionClass}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-1">
        Advanced Filters
      </h2>

      <div className="space-y-5">
        {materialNodes.length > 0 && (
          <MaterialNodeDropdown
            nodes={materialNodes}
            selectedIds={selectedMaterialNodeIds}
            onChange={onMaterialNodeIdsChange}
          />
        )}

        {facets.map((facet) => (
          <FacetDropdown
            key={facet.id}
            facet={facet}
            allSelectedIds={selectedFacetValueIds}
            onChange={onFacetValueIdsChange}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Generic click-outside + Escape hook ────────────────────────────────────

function useDropdownClose(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  close: () => void
) {
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close, containerRef]);
}

// ─── Token component ────────────────────────────────────────────────────────

function Token({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[#002abf]/8 px-2 py-0.5 text-xs font-medium text-[#002abf] dark:bg-[#002abf]/20 dark:text-blue-300">
      {label}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 rounded-sm p-0.5 hover:bg-[#002abf]/15 dark:hover:bg-[#002abf]/30"
        aria-label={`Remove ${label}`}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

// ─── Material Node Dropdown ─────────────────────────────────────────────────

function MaterialNodeDropdown({
  nodes,
  selectedIds,
  onChange,
}: {
  nodes: MaterialNodeForForm[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useDropdownClose(containerRef, isOpen, close);

  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
  }, [isOpen]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const families = useMemo(() => {
    const roots = nodes.filter((n) => n.depth === 0);
    return roots.map((root) => ({
      ...root,
      children: nodes.filter(
        (n) => n.depth > 0 && isDescendant(nodes, n, root.id)
      ),
    }));
  }, [nodes]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return families.map((f) => ({
        family: f.label,
        items: [f, ...f.children],
      })).filter((g) => g.items.length > 0);
    }
    const flat = nodes.filter((n) => n.label.toLowerCase().includes(q));
    return flat.length > 0 ? [{ family: "", items: flat }] : [];
  }, [families, nodes, query]);

  const toggle = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else {
        onChange([...selectedIds, id]);
      }
    },
    [selectedIds, onChange]
  );

  const labelForId = useCallback(
    (id: string) => nodes.find((n) => n.id === id)?.label ?? id,
    [nodes]
  );

  const clearAll = useCallback(() => onChange([]), [onChange]);

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>Material Taxonomy</label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedIds.length === 0 ? (
            <span className="text-zinc-400 dark:text-zinc-500">Select materials…</span>
          ) : selectedIds.length <= 3 ? (
            selectedIds.map((id) => (
              <Token key={id} label={labelForId(id)} onRemove={() => toggle(id)} />
            ))
          ) : (
            <span className="text-zinc-700 dark:text-zinc-300">
              {selectedIds.length} selected
            </span>
          )}
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`shrink-0 text-zinc-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search materials…"
              className="w-full rounded border-none bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div className="max-h-56 overflow-auto py-1">
            {filteredGroups.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No results</p>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.family || "__flat"}>
                  {group.family && (
                    <div className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {group.family}
                    </div>
                  )}
                  {group.items.map((item) => {
                    const checked = selectedSet.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            checked
                              ? "border-[#002abf] bg-[#002abf] text-white"
                              : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                          }`}
                        >
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                              <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span
                          className={
                            item.depth === 0
                              ? "font-medium text-zinc-900 dark:text-zinc-100"
                              : item.depth === 1
                              ? "ml-2 text-zinc-800 dark:text-zinc-200"
                              : "ml-4 text-zinc-600 dark:text-zinc-400"
                          }
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-[#002abf] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Check if `node` is a descendant of `ancestorId` within `nodes`. */
function isDescendant(
  nodes: MaterialNodeForForm[],
  node: MaterialNodeForForm,
  ancestorId: string
): boolean {
  let current: MaterialNodeForForm | undefined = node;
  let steps = 0;
  while (current && steps < 5) {
    if (current.parent_id === ancestorId) return true;
    current = nodes.find((n) => n.id === current!.parent_id);
    steps++;
  }
  return false;
}

// ─── Facet Dropdown Multi-Select ────────────────────────────────────────────

function FacetDropdown({
  facet,
  allSelectedIds,
  onChange,
}: {
  facet: FacetForForm;
  allSelectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const showSearch = facet.values.length > 12;

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  useDropdownClose(containerRef, isOpen, close);

  useEffect(() => {
    if (isOpen && showSearch) searchRef.current?.focus();
  }, [isOpen, showSearch]);

  const facetValueIdSet = useMemo(
    () => new Set(facet.values.map((v) => v.id)),
    [facet.values]
  );

  const selectedInFacet = useMemo(
    () => allSelectedIds.filter((id) => facetValueIdSet.has(id)),
    [allSelectedIds, facetValueIdSet]
  );

  const filteredValues = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return facet.values;
    return facet.values.filter((v) => v.label.toLowerCase().includes(q));
  }, [facet.values, query]);

  const toggle = useCallback(
    (valueId: string) => {
      if (allSelectedIds.includes(valueId)) {
        onChange(allSelectedIds.filter((x) => x !== valueId));
      } else {
        onChange([...allSelectedIds, valueId]);
      }
    },
    [allSelectedIds, onChange]
  );

  const clearFacet = useCallback(() => {
    onChange(allSelectedIds.filter((id) => !facetValueIdSet.has(id)));
  }, [allSelectedIds, facetValueIdSet, onChange]);

  const labelForId = useCallback(
    (id: string) => facet.values.find((v) => v.id === id)?.label ?? id,
    [facet.values]
  );

  const selectedSet = useMemo(() => new Set(allSelectedIds), [allSelectedIds]);

  return (
    <div ref={containerRef} className="relative">
      <label className={labelClass}>{facet.label}</label>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedInFacet.length === 0 ? (
            <span className="text-zinc-400 dark:text-zinc-500">Select {facet.label.toLowerCase()}…</span>
          ) : selectedInFacet.length <= 3 ? (
            selectedInFacet.map((id) => (
              <Token key={id} label={labelForId(id)} onRemove={() => toggle(id)} />
            ))
          ) : (
            <span className="text-zinc-700 dark:text-zinc-300">
              {selectedInFacet.length} selected
            </span>
          )}
        </div>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`shrink-0 text-zinc-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          {showSearch && (
            <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${facet.label.toLowerCase()}…`}
                className="w-full rounded border-none bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          )}

          <div className="max-h-56 overflow-auto py-1">
            {filteredValues.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">No results</p>
            ) : (
              filteredValues.map((v) => {
                const checked = selectedSet.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggle(v.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        checked
                          ? "border-[#002abf] bg-[#002abf] text-white"
                          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                      }`}
                    >
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200">{v.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {selectedInFacet.length > 0 && (
            <div className="border-t border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={clearFacet}
                className="text-xs font-medium text-[#002abf] hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

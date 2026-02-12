"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SuggestItem } from "@/app/api/search/suggest/route";

const POPOVER_Z = 2000;
const BACKDROP_Z = 1999;

const POPULAR_PROJECTS = ["travertine", "Bodrum", "oak chair", "concrete", "minimal", "lighting"];
const POPULAR_PRODUCTS = ["pendant", "oak", "marble", "concrete", "minimal", "recycled"];

export interface SearchSuggestionsPopoverProps {
  open: boolean;
  onClose: () => void;
  position: { top: number; left: number; width: number };
  scope: "projects" | "products";
  currentQ: string;
  onSelect: (value: string) => void;
  recentSearches: string[];
  onClearRecent: () => void;
  /** Used for aria-controls on the trigger input */
  id?: string;
}

export function SearchSuggestionsPopover({
  open,
  onClose,
  position,
  scope,
  currentQ,
  onSelect,
  recentSearches,
  onClearRecent,
  id: popoverId,
}: SearchSuggestionsPopoverProps) {
  const [liveItems, setLiveItems] = useState<SuggestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const popular = scope === "projects" ? POPULAR_PROJECTS : POPULAR_PRODUCTS;
  const hasQuery = currentQ.trim().length >= 2;
  const showRecentAndPopular = !hasQuery && open;
  const showLive = hasQuery && open;

  const allOptions = useMemo(
    () => (showLive ? liveItems.map((i) => ({ value: i.value, label: i.label, type: i.type })) : []),
    [showLive, liveItems]
  );

  useEffect(() => {
    if (!hasQuery) {
      setLiveItems([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = new AbortController();
      fetch(
        `/api/search/suggest?type=${scope}&q=${encodeURIComponent(currentQ.trim())}`,
        { signal: fetchAbortRef.current.signal }
      )
        .then((res) => res.json())
        .then((data: { items?: SuggestItem[] }) => {
          setLiveItems(Array.isArray(data.items) ? data.items : []);
        })
        .catch(() => setLiveItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      fetchAbortRef.current?.abort();
    };
  }, [scope, currentQ, hasQuery]);

  const recentCount = Math.min(6, recentSearches.length);
  const totalOptions = showRecentAndPopular ? recentCount + Math.min(6, popular.length) : allOptions.length;

  const getOptionAt = useCallback(
    (index: number): string | null => {
      if (showRecentAndPopular) {
        if (index < recentCount) return recentSearches[index] ?? null;
        return popular[index - recentCount] ?? null;
      }
      return allOptions[index]?.value ?? null;
    },
    [showRecentAndPopular, recentSearches, recentCount, popular, allOptions]
  );

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [currentQ, showLive, showRecentAndPopular]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i < totalOptions - 1 ? i + 1 : i));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const value = getOptionAt(highlightedIndex);
        if (value) onSelect(value);
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, highlightedIndex, totalOptions, getOptionAt, onSelect, onClose]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  if (!open || typeof document === "undefined") return null;

  const content = (
    <>
      <div
        className="fixed inset-0 md:hidden"
        style={{ zIndex: BACKDROP_Z, backgroundColor: "rgba(0,0,0,0.3)" }}
        aria-hidden
        onClick={onClose}
      />
      <div
        id={popoverId}
        ref={listRef}
        role="listbox"
        className="max-h-[min(70vh,400px)] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        style={{
          position: "fixed",
          left: position.left,
          top: position.top,
          width: Math.max(position.width, 280),
          zIndex: POPOVER_Z,
        }}
      >
        {showRecentAndPopular && (
          <div className="py-2">
            {recentSearches.length > 0 && (
              <>
                <div className="flex items-center justify-between px-4 py-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Recent searches
                  </span>
                  <button
                    type="button"
                    onClick={onClearRecent}
                    className="text-xs text-[#002abf] hover:underline"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.slice(0, 6).map((s, i) => (
                  <button
                    key={`recent-${s}-${i}`}
                    type="button"
                    data-index={i}
                    onClick={() => onSelect(s)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                      highlightedIndex === i ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </>
            )}
            <div className="mt-1 border-t border-zinc-100 px-4 py-1 dark:border-zinc-700">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Popular
              </span>
            </div>
            {popular.slice(0, 6).map((s, i) => (
              <button
                key={`pop-${s}`}
                type="button"
                data-index={recentCount + i}
                onClick={() => onSelect(s)}
                onMouseEnter={() => setHighlightedIndex(recentCount + i)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                  highlightedIndex === recentCount + i ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {showLive && (
          <div className="py-2">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Searching…
              </div>
            ) : allOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No suggestions
              </div>
            ) : (
              allOptions.map((opt, i) => (
                <button
                  key={`${opt.type}-${opt.value}-${i}`}
                  type="button"
                  data-index={i}
                  onClick={() => onSelect(opt.value)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${
                    highlightedIndex === i ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="text-[10px] font-medium uppercase text-zinc-400 dark:text-zinc-500">
                    {opt.type}
                  </span>
                  <span>{opt.label}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(content, document.body);
}

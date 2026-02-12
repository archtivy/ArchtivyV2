"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SearchSuggestionsPopover } from "@/components/search/SearchSuggestionsPopover";
import { getRecentSearches, addRecentSearch, clearRecentSearches, type SearchScope } from "@/lib/search/recentSearches";
import { filtersToQueryString } from "@/lib/explore/filters/query";
import type { ExploreFilters } from "@/lib/explore/filters/schema";

const DEBOUNCE_MS = 300;

export interface ExploreSearchBarProps {
  type: "projects" | "products";
  currentFilters: ExploreFilters;
  placeholder?: string;
  className?: string;
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function ExploreSearchBar({
  type,
  currentFilters,
  placeholder = "Search by title, designer, brand, material, city…",
  className = "",
}: ExploreSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState(currentFilters.q ?? "");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const scope: SearchScope = type;

  useEffect(() => {
    setInputValue(currentFilters.q ?? "");
  }, [currentFilters.q]);

  useEffect(() => {
    setRecentSearches(getRecentSearches(scope));
  }, [scope, popoverOpen]);

  const updateUrl = useCallback(
    (q: string) => {
      const next = q.trim();
      const nextFilters = { ...currentFilters, q: next || null };
      const qs = filtersToQueryString(nextFilters, type);
      const search = qs.toString();
      router.push(search ? `${pathname}?${search}` : pathname);
    },
    [currentFilters, type, pathname, router]
  );

  const updatePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [popoverOpen, updatePosition]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateUrl(v), DEBOUNCE_MS);
  };

  const handleClear = () => {
    setInputValue("");
    updateUrl("");
    inputRef.current?.focus();
    setPopoverOpen(true);
  };

  const handleSelect = useCallback(
    (value: string) => {
      setInputValue(value);
      updateUrl(value);
      addRecentSearch(scope, value);
      setRecentSearches(getRecentSearches(scope));
      setPopoverOpen(false);
      inputRef.current?.blur();
    },
    [scope, updateUrl]
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches(scope);
    setRecentSearches([]);
  }, [scope]);

  return (
    <div className={className}>
      <div className="relative max-w-[720px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={popoverOpen}
          aria-controls="explore-search-suggestions"
          aria-autocomplete="list"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            updatePosition();
            setPopoverOpen(true);
          }}
          onBlur={() => {
            setTimeout(() => setPopoverOpen(false), 150);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-12 pr-11 text-zinc-900 placeholder-zinc-400 focus:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-[#002abf] dark:focus:ring-[#002abf]/30"
        />
        {inputValue.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>
      <SearchSuggestionsPopover
        id="explore-search-suggestions"
        open={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        position={position}
        scope={scope}
        currentQ={inputValue}
        onSelect={handleSelect}
        recentSearches={recentSearches}
        onClearRecent={handleClearRecent}
      />
    </div>
  );
}

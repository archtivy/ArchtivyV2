"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSuggestionsPopover } from "@/components/search/SearchSuggestionsPopover";
import { getRecentSearches, addRecentSearch, clearRecentSearches, type SearchScope } from "@/lib/search/recentSearches";
import { track } from "@/lib/events";

const PLACEHOLDER = "Search projects, products, materials, locations…";
const HINT = "Try: 'travertine', 'Bodrum', 'oak chair', 'concrete'…";

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

export function HomeHeroSearch() {
  const router = useRouter();
  const [scope, setScope] = useState<"projects" | "products">("projects");
  const [inputValue, setInputValue] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const updatePosition = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 4, width: rect.width });
  }, []);

  useEffect(() => {
    setRecentSearches(getRecentSearches(scope));
  }, [scope, popoverOpen]);

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

  const navigateToExplore = useCallback(
    (q: string) => {
      const trimmed = q?.trim() || "";
      if (trimmed) {
        addRecentSearch(scope, trimmed);
        track("search", { q: trimmed, scope });
      }
      const url = trimmed ? `/explore/${scope}?q=${encodeURIComponent(trimmed)}` : `/explore/${scope}`;
      router.push(url);
    },
    [scope, router]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToExplore(inputValue);
    setPopoverOpen(false);
  };

  const handleSelect = useCallback(
    (value: string) => {
      const trimmed = value?.trim() || "";
      setInputValue(trimmed);
      if (trimmed) {
        addRecentSearch(scope, trimmed);
        track("search", { q: trimmed, scope });
      }
      setRecentSearches(getRecentSearches(scope));
      setPopoverOpen(false);
      router.push(trimmed ? `/explore/${scope}?q=${encodeURIComponent(trimmed)}` : `/explore/${scope}`);
    },
    [scope, router]
  );

  const handleClearRecent = useCallback(() => {
    clearRecentSearches(scope);
    setRecentSearches([]);
  }, [scope]);

  return (
    <div className="mx-auto w-full max-w-[560px] sm:max-w-[640px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div
            className="flex shrink-0 items-center gap-1 rounded-l-xl border-r border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800"
            role="group"
            aria-label="Search scope"
          >
            <button
              type="button"
              onClick={() => setScope("projects")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                scope === "projects"
                  ? "bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Projects
            </button>
            <button
              type="button"
              onClick={() => setScope("products")}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                scope === "products"
                  ? "bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              Products
            </button>
          </div>
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <SearchIcon />
            </div>
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              role="combobox"
              aria-expanded={popoverOpen}
              aria-controls="home-search-suggestions"
              aria-autocomplete="list"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onFocus={() => {
                updatePosition();
                setPopoverOpen(true);
              }}
              onBlur={() => setTimeout(() => setPopoverOpen(false), 150)}
              placeholder={PLACEHOLDER}
              className="w-full rounded-r-xl border-0 bg-transparent py-3 pl-12 pr-11 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
            {inputValue.length > 0 && (
              <button
                type="button"
                onClick={() => setInputValue("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4"
                aria-label="Clear"
              >
                <ClearIcon />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{HINT}</p>
      </form>
      <SearchSuggestionsPopover
        id="home-search-suggestions"
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

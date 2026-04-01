"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Concrete houses in Tokyo",
  "Residential projects in Costa Rica",
  "Wooden interiors in Scandinavia",
  "Minimalist villas in the Mediterranean",
  "Lighting brands near Milan",
  "Cultural projects in Mexico City",
  "Brutalist architecture in London",
  "Sustainable housing in the Netherlands",
];

const DESKTOP_PROMPTS = [
  "Concrete houses in Tokyo",
  "Residential in Costa Rica",
  "Wooden interiors",
];

/** Mobile discovery categories — broader, more tappable. */
const MOBILE_CATEGORIES = [
  { label: "Residential projects", query: "Residential projects" },
  { label: "Materials in real use", query: "Materials used in projects" },
  { label: "Cultural buildings", query: "Cultural projects" },
  { label: "Trending this week", query: "Recent projects" },
  { label: "Minimalist design", query: "Minimalist architecture" },
  { label: "Sustainable housing", query: "Sustainable housing" },
];

interface FloatingAISearchProps {
  onSubmit: (query: string) => void;
  panelOpen?: boolean;
  searchLabel?: string | null;
  resultCount?: number | null;
  onClear?: () => void;
  totalPins?: number;
}

export function FloatingAISearch({
  onSubmit,
  panelOpen,
  searchLabel,
  resultCount,
  onClear,
  totalPins,
}: FloatingAISearchProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [mobileSheet, setMobileSheet] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const hasActiveSearch = searchLabel != null && searchLabel.length > 0;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setSuggestionIndex((i) => (i + 1) % SUGGESTIONS.length), 4500);
    return () => clearInterval(iv);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;
      onSubmit(q);
      inputRef.current?.blur();
      setMobileSheet(false);
    },
    [value, onSubmit],
  );

  const handleSuggestion = useCallback(
    (s: string) => {
      setValue(s);
      onSubmit(s);
      setMobileSheet(false);
    },
    [onSubmit],
  );

  const handleClear = useCallback(() => {
    setValue("");
    onClear?.();
  }, [onClear]);

  const handleMobileFocus = useCallback(() => {
    if (isMobile) {
      setMobileSheet(true);
      setTimeout(() => mobileInputRef.current?.focus(), 100);
    } else {
      setFocused(true);
    }
  }, [isMobile]);

  const placeholder = SUGGESTIONS[suggestionIndex];

  return (
    <>
      {/* ── Main search pill (bottom center) ──────────────────────────────── */}
      <div
        className={`absolute left-1/2 z-30 w-[calc(100%-24px)] max-w-[580px] -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          panelOpen ? "sm:max-w-[400px] sm:-translate-x-[calc(50%+100px)]" : ""
        }`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        {/* Desktop discovery prompts */}
        {!hasActiveSearch && !isMobile && (
          <div
            className={`mb-2 hidden transition-all duration-300 sm:block ${
              focused ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
            }`}
          >
            <div className="flex justify-center gap-1.5">
              {DESKTOP_PROMPTS.map((p) => (
                <button
                  key={p}
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestion(p); }}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-all hover:text-zinc-700"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400" aria-hidden>
                    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Glass search box */}
        <form onSubmit={handleSubmit} className="relative">
          <div
            className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
              focused ? "ring-1 ring-[#002abf]/15" : ""
            }`}
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(24px) saturate(1.3)",
              WebkitBackdropFilter: "blur(24px) saturate(1.3)",
              border: "1px solid rgba(255,255,255,0.4)",
              boxShadow: focused
                ? "0 4px 32px -4px rgba(0,42,191,0.08), 0 2px 12px -2px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.6)"
                : "0 2px 20px -4px rgba(0,0,0,0.06), 0 1px 6px -1px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.6)",
            }}
          >
            <div
              className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 ${focused ? "opacity-100" : "opacity-0"}`}
              style={{ background: "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(0,42,191,0.03) 0%, transparent 70%)" }}
            />

            <div className="relative flex items-center">
              <div className="pointer-events-none flex shrink-0 items-center pl-4 pr-1">
                <svg className={`h-[18px] w-[18px] transition-colors duration-200 ${focused ? "text-[#002abf]/60" : "text-zinc-400/70"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </div>

              {/* On mobile: tapping opens the bottom sheet instead of inline focus */}
              {isMobile ? (
                <button
                  type="button"
                  onClick={handleMobileFocus}
                  className="min-w-0 flex-1 py-3.5 pr-2 text-left text-[14px] text-zinc-400/60"
                >
                  {hasActiveSearch ? searchLabel : placeholder}
                </button>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  className="min-w-0 flex-1 bg-transparent py-3.5 pr-2 text-[14px] font-normal text-zinc-900 outline-none placeholder:text-zinc-400/60"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}

              {(value || hasActiveSearch) && (
                <button type="button" onClick={handleClear} className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200/40 hover:text-zinc-600">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              )}

              {!isMobile && (
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className={`mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                    value.trim() ? "bg-[#002abf] text-white shadow-sm hover:bg-[#0022a0]" : "bg-zinc-200/40 text-zinc-400"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Desktop: search result + context */}
          {!isMobile && hasActiveSearch && (
            <div className="mt-2 flex items-center justify-center">
              <span className="rounded-lg px-3 py-1 text-[11px] font-medium text-zinc-600" style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)" }}>
                {searchLabel}
                {resultCount != null && <span className="ml-1 text-zinc-400">· {resultCount} {resultCount === 1 ? "result" : "results"}</span>}
              </span>
            </div>
          )}

          {!isMobile && !hasActiveSearch && !focused && totalPins != null && totalPins > 0 && (
            <div className="mt-1.5 text-center">
              <span className="text-[10px] text-zinc-400/60">{totalPins.toLocaleString()} projects, designers, and brands on the map</span>
            </div>
          )}
        </form>
      </div>

      {/* ── Mobile bottom sheet ───────────────────────────────────────────── */}
      {mobileSheet && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSheet(false)} />

          {/* Sheet */}
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto bg-white dark:bg-zinc-900"
            style={{
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pb-1 pt-2.5">
              <div className="h-1 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            </div>

            {/* Search input */}
            <form
              onSubmit={(e) => { e.preventDefault(); const q = value.trim(); if (q) { onSubmit(q); setMobileSheet(false); } }}
              className="flex items-center gap-2 px-4 pb-3"
            >
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Search projects, products, brands..."
                  className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileSheet(false)}
                className="shrink-0 px-1 py-2 text-[13px] font-medium text-zinc-500"
              >
                Cancel
              </button>
            </form>

            {/* Active search result */}
            {hasActiveSearch && (
              <div className="mx-4 mb-3 flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800">
                <span className="text-[13px] text-zinc-600 dark:text-zinc-300">
                  {searchLabel}
                  {resultCount != null && <span className="text-zinc-400"> · {resultCount}</span>}
                </span>
                <button type="button" onClick={handleClear} className="text-[12px] text-zinc-400">Clear</button>
              </div>
            )}

            {/* Discovery categories */}
            <div className="px-4 pb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Explore
              </p>
              <div className="grid grid-cols-2 gap-2">
                {MOBILE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => handleSuggestion(cat.query)}
                    className="rounded-lg border border-zinc-100 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-zinc-700 transition active:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pin count context */}
            {totalPins != null && totalPins > 0 && (
              <div className="border-t border-zinc-100 px-4 py-3 text-center dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">{totalPins.toLocaleString()} items on the map</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════ */

const SUGGESTIONS = [
  "Concrete buildings in Tokyo",
  "Minimalist villas in Spain",
  "Lighting brands near Milan",
  "Brutalist houses in London",
  "Architects near me",
  "Cultural projects in Mexico City",
  "Residential interiors in Copenhagen",
];

/* ═══════════════════════════════════════════════════════════════════════════ */

interface FloatingAISearchProps {
  onSubmit: (query: string) => void;
  /** Whether a detail panel is open (shrinks the box on mobile) */
  panelOpen?: boolean;
  /** Interpreted search label to display. Null = no active search. */
  searchLabel?: string | null;
  /** Number of matched results. */
  resultCount?: number | null;
  /** Clear the active search. */
  onClear?: () => void;
}

export function FloatingAISearch({
  onSubmit,
  panelOpen,
  searchLabel,
  resultCount,
  onClear,
}: FloatingAISearchProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasActiveSearch = searchLabel != null && searchLabel.length > 0;

  /* Rotate placeholder suggestions */
  useEffect(() => {
    const iv = setInterval(
      () => setSuggestionIndex((i) => (i + 1) % SUGGESTIONS.length),
      4500,
    );
    return () => clearInterval(iv);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (!q) return;
      onSubmit(q);
      inputRef.current?.blur();
    },
    [value, onSubmit],
  );

  const handleSuggestion = useCallback(
    (s: string) => {
      setValue(s);
      onSubmit(s);
    },
    [onSubmit],
  );

  const handleClear = useCallback(() => {
    setValue("");
    onClear?.();
    inputRef.current?.focus();
  }, [onClear]);

  const placeholder = SUGGESTIONS[suggestionIndex];

  return (
    <div
      className={`absolute bottom-5 left-1/2 z-30 w-[calc(100%-24px)] max-w-[580px] -translate-x-1/2 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        panelOpen ? "sm:max-w-[400px] sm:-translate-x-[calc(50%+100px)]" : ""
      }`}
    >
      {/* Suggestion chips — shown only on focus when no active search */}
      {!hasActiveSearch && (
        <div
          className={`mb-2 flex justify-center gap-1.5 transition-all duration-300 ${
            focused
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {SUGGESTIONS.slice(0, 3).map((s) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestion(s);
              }}
              className="rounded-md bg-white/60 px-2.5 py-1 text-[11px] font-medium text-zinc-500 backdrop-blur-md transition-all hover:bg-white/80 hover:text-zinc-700"
              style={{
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Main glass search box */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
            focused ? "ring-1 ring-[#002abf]/15" : ""
          }`}
          style={{
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(24px) saturate(1.3)",
            WebkitBackdropFilter: "blur(24px) saturate(1.3)",
            border: "1px solid rgba(255, 255, 255, 0.4)",
            boxShadow: focused
              ? "0 4px 32px -4px rgba(0, 42, 191, 0.08), 0 2px 12px -2px rgba(0, 0, 0, 0.06), inset 0 0.5px 0 rgba(255,255,255,0.6)"
              : "0 2px 20px -4px rgba(0, 0, 0, 0.06), 0 1px 6px -1px rgba(0, 0, 0, 0.04), inset 0 0.5px 0 rgba(255,255,255,0.6)",
          }}
        >
          {/* Subtle atmospheric glow */}
          <div
            className={`pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500 ${
              focused ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(0, 42, 191, 0.03) 0%, transparent 70%)",
            }}
          />

          <div className="relative flex items-center">
            {/* Search / AI icon */}
            <div className="pointer-events-none flex shrink-0 items-center pl-4 pr-1">
              <svg
                className={`h-[18px] w-[18px] transition-colors duration-200 ${
                  focused ? "text-[#002abf]/60" : "text-zinc-400/70"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent py-3.5 pr-2 text-[14px] font-normal text-zinc-900 outline-none placeholder:text-zinc-400/60 placeholder:transition-opacity"
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
            {(value || hasActiveSearch) && (
              <button
                type="button"
                onClick={handleClear}
                className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-200/40 hover:text-zinc-600"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Submit arrow */}
            <button
              type="submit"
              disabled={!value.trim()}
              className={`mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                value.trim()
                  ? "bg-[#002abf] text-white shadow-sm hover:bg-[#0022a0]"
                  : "bg-zinc-200/40 text-zinc-400"
              }`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search result interpretation strip */}
        {hasActiveSearch && (
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <p className="text-[11px] text-zinc-500/80">
              <span className="font-medium text-zinc-600/90">Showing:</span>{" "}
              {searchLabel}
              {resultCount != null && (
                <span className="ml-1 text-zinc-400/70">
                  · {resultCount} {resultCount === 1 ? "result" : "results"}
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#002abf]/70 transition-colors hover:bg-white/40 hover:text-[#002abf]"
            >
              Clear
            </button>
          </div>
        )}

        {/* Subtle helper text — only when no search and focused */}
        {!hasActiveSearch && (
          <p
            className={`mt-1.5 text-center text-[11px] text-zinc-400/70 transition-all duration-300 ${
              focused
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-1 opacity-0"
            }`}
          >
            Search architecture by describing what you&apos;re looking for
          </p>
        )}
      </form>
    </div>
  );
}

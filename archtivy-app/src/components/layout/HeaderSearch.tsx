"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ─── Route classification ────────────────────────────────────────────────────

type HeaderMode = "hidden" | "inline" | "compact";

function getHeaderMode(pathname: string): HeaderMode {
  if (pathname === "/") return "hidden";
  if (
    pathname.startsWith("/explore/projects") ||
    pathname.startsWith("/explore/products") ||
    pathname.startsWith("/designers") ||
    pathname.startsWith("/brands") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/products")
  ) return "inline";
  return "compact";
}

function getPlaceholder(pathname: string): string {
  if (pathname.startsWith("/explore/products") || pathname.startsWith("/products")) {
    return "Search products, brands, materials\u2026";
  }
  return "Search projects, products, materials\u2026";
}

function getSearchType(pathname: string): "projects" | "products" {
  if (pathname.startsWith("/explore/products") || pathname.startsWith("/products")) return "products";
  return "projects";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inlineRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const mode = getHeaderMode(pathname);
  const placeholder = getPlaceholder(pathname);
  const searchType = getSearchType(pathname);

  const close = useCallback(() => setOpen(false), []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      const base = `/explore/${searchType}`;
      const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
      router.push(url);
      close();
      inlineRef.current?.blur();
    },
    [query, searchType, router, close]
  );

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(t) && triggerRef.current && !triggerRef.current.contains(t)) close();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, close]);

  // ⌘K shortcut
  useEffect(() => {
    if (mode === "hidden") return;
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (mode === "inline") {
          inlineRef.current?.focus();
        } else {
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [mode]);

  if (mode === "hidden") return null;

  // ── Inline mode: visible input pill on explore/discovery pages ──────────

  if (mode === "inline" && !isMobile) {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-sm lg:max-w-md">
        <div
          className={`flex items-center rounded border transition-colors duration-150 ${
            focused
              ? "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
              : "border-zinc-200/70 bg-zinc-50/60 dark:border-zinc-700/60 dark:bg-zinc-900/40"
          }`}
          style={{ borderRadius: 5 }}
        >
          <SearchIcon className="ml-2.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <input
            ref={inlineRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            aria-label="Search"
          />
          <kbd className="mr-2 hidden shrink-0 select-none border-l border-zinc-200/60 pl-2 font-mono text-[10px] text-zinc-300 dark:border-zinc-700/60 dark:text-zinc-600 lg:inline-block">
            ⌘K
          </kbd>
        </div>
      </form>
    );
  }

  // ── Compact mode: icon trigger with popover (non-explore pages + mobile fallback) ─

  return (
    <div className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 w-8 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 focus:ring-offset-white dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 dark:focus:ring-offset-zinc-950"
        aria-label="Search"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SearchIcon />
      </button>

      {open && (
        <>
          {isMobile ? (
            <>
              <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={close} />
              <div
                ref={popoverRef}
                role="dialog"
                aria-label="Search"
                className="fixed inset-x-0 top-0 z-50 border-b border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
                  <div className="flex flex-1 items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800" style={{ borderRadius: 6 }}>
                    <SearchIcon className="shrink-0 text-zinc-400" />
                    <input
                      ref={inputRef}
                      type="search"
                      placeholder={placeholder}
                      autoComplete="off"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="flex-1 bg-transparent py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      aria-label="Search"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                    aria-label="Close search"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Search"
              className="absolute right-0 top-full z-50 mt-2 w-[400px] border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900"
              style={{ borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 rounded border border-zinc-200 bg-zinc-50 px-3 dark:border-zinc-700 dark:bg-zinc-800" style={{ borderRadius: 6 }}>
                  <SearchIcon className="shrink-0 text-zinc-400" />
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder={placeholder}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    aria-label="Search"
                  />
                  <kbd className="hidden shrink-0 select-none rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500 sm:inline-block">
                    ⌘K
                  </kbd>
                </div>
              </form>
              <p className="mt-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                Search projects, products, materials, and professionals.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

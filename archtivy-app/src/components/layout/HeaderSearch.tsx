"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
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

export function HeaderSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isHidden = pathname === "/";

  const close = useCallback(() => setOpen(false), []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      const type =
        pathname === "/explore/products"
          ? "products"
          : pathname === "/explore/projects"
            ? "projects"
            : "projects";
      const base = `/explore/${type}`;
      const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
      router.push(url);
      close();
    },
    [query, pathname, router, close]
  );

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  if (isHidden) return null;

  return (
    <div className="relative flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 focus:ring-offset-white"
        aria-label="Search"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SearchIcon className="shrink-0" />
        <span className="hidden sm:inline">Search</span>
      </button>

      {open && (
        <>
          {isMobile ? (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30"
                aria-hidden
                onClick={close}
              />
              <div
                ref={popoverRef}
                role="dialog"
                aria-label="Search"
                className="fixed inset-x-0 top-0 z-50 border-b border-[#f3f3f3] bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder="Type to search…"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    aria-label="Search"
                  />
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:hover:bg-zinc-700 dark:text-zinc-400"
                    aria-label="Close search"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </form>
                <div className="border-t border-zinc-100 px-4 py-6">
                  <p className="text-sm text-zinc-500">
                    Type to search projects, products, and people.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Search"
              className="absolute right-0 top-full z-50 mt-1.5 w-[420px] max-w-[calc(100vw-2rem)] rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              style={{
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder="Type to search…"
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded border border-zinc-200 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf]/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  aria-label="Search"
                />
              </form>
              <div className="mt-3 border-t border-zinc-100 pt-3">
                <p className="text-xs text-zinc-500">
                  Type to search projects, products, and people.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

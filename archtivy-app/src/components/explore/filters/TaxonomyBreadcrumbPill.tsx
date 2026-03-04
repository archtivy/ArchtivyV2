"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { TaxonomyTreeNode, ExploreType } from "@/lib/explore/filters/schema";
import { TaxonomyFilterTree } from "./TaxonomyFilterTree";

const DROPDOWN_Z = 1000;
const BACKDROP_Z = 999;

interface TaxonomyBreadcrumbPillProps {
  type: ExploreType;
  tree: TaxonomyTreeNode[];
  currentSlugPath: string | null;
  /** Current query string to preserve when navigating. */
  queryString: string;
}

/** Format slug_path "furniture/seating/dining-chair" → "Furniture > Seating > Dining Chair". */
function slugPathToLabel(slugPath: string): string {
  return slugPath
    .split("/")
    .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" > ");
}

export function TaxonomyBreadcrumbPill({
  type,
  tree,
  currentSlugPath,
  queryString,
}: TaxonomyBreadcrumbPillProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const basePath = type === "products" ? "/explore/products" : "/explore/projects";

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 260) });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        open &&
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const handleSelect = useCallback(
    (slugPath: string | null) => {
      setOpen(false);
      const path = slugPath ? `${basePath}/${slugPath}` : basePath;
      const url = queryString ? `${path}?${queryString}` : path;
      router.push(url);
    },
    [basePath, queryString, router]
  );

  const hasSelection = !!currentSlugPath;
  const displayLabel = currentSlugPath ? slugPathToLabel(currentSlugPath) : "Category";

  if (tree.length === 0) return null;

  const dropdown =
    open && typeof document !== "undefined" ? (
      <>
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: BACKDROP_Z, backgroundColor: "rgba(0,0,0,0.3)" }}
          aria-hidden
          onClick={() => setOpen(false)}
        />
        <div
          ref={panelRef}
          className="max-h-[min(72vh,360px)] min-w-[260px] overflow-auto rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            position: "fixed",
            left: position.left,
            top: position.top,
            width: position.width,
            zIndex: DROPDOWN_Z,
          }}
        >
          {/* "All" option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
              !currentSlugPath ? "font-medium text-[#002abf]" : "text-zinc-600 dark:text-zinc-300"
            }`}
          >
            All {type === "products" ? "Products" : "Projects"}
          </button>
          <TaxonomyFilterTree
            tree={tree}
            currentSlugPath={currentSlugPath}
            onSelect={handleSelect}
          />
        </div>
      </>
    ) : null;

  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            setOpen((prev) => !prev);
            if (!open) setTimeout(updatePosition, 0);
          }}
          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
            hasSelection
              ? "border-[#002abf] bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Category filter, ${hasSelection ? displayLabel : "none selected"}`}
        >
          <span className="max-w-[200px] truncate">{displayLabel}</span>
          <span className="text-zinc-400" aria-hidden>
            ▾
          </span>
        </button>
        {hasSelection && (
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Clear category filter"
          >
            ×
          </button>
        )}
      </div>
      {open && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}

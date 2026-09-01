"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryTreeNode } from "@/lib/directory/categoryTree";

/**
 * Category, expanding into subcategories — roots on the left, the hovered
 * root's children on the right.
 *
 * ── IT NAVIGATES, IT DOES NOT FILTER ────────────────────────────────────────
 * Every entry routes to /projects/{slug_path} or /products/{slug_path}, the
 * canonical archives that already exist and are already indexable. That is the
 * same decision the flat category rail this replaces made, and the reason a
 * subcategory works at all: `buildingTypes` (projects) and `categories`
 * (products) are ROOT-level
 * facets, so a flat filter list cannot express "residential/apartment" —
 * the archive route can, and every archive depth renders through this same
 * directory body.
 *
 * ── PORTALLED ───────────────────────────────────────────────────────────────
 * The pill row sits inside the page container; a two-column panel anchored to
 * a pill overflows it. Rendering into document.body with fixed positioning
 * keeps the panel clear of any ancestor's overflow and of the sticky header.
 */
export function CategoryCascadeFilter({
  tree,
  basePath,
  allLabel,
  activeSlugPath = null,
}: {
  tree: CategoryTreeNode[];
  /** "/projects" or "/products". */
  basePath: string;
  /** Pill label when nothing is scoped, e.g. "All Categories". */
  allLabel: string;
  /** Current archive path, e.g. "residential/apartment", when scoped. */
  activeSlugPath?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = tree.some((t) => t.children.length > 0) ? 460 : 240;
      setPos({
        top: r.bottom + 6,
        left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, tree]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = useCallback(
    (slugPath: string | null) => {
      setOpen(false);
      router.push(slugPath ? `${basePath}/${slugPath}` : basePath);
    },
    [router, basePath]
  );

  const activeRoot = activeSlugPath?.split("/")[0] ?? null;
  const activeLabel =
    (activeSlugPath &&
      (tree
        .flatMap((r) => [r, ...r.children])
        .find((n) => n.slugPath === activeSlugPath)?.label ??
        null)) ||
    allLabel;

  const hasChildren = tree.some((t) => t.children.length > 0);
  const shown = hovered ?? activeRoot ?? tree[0]?.slug ?? null;
  const children = tree.find((r) => r.slug === shown)?.children ?? [];

  if (tree.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 font-body text-[14px] transition-colors",
          activeSlugPath || open
            ? "border-ink/40 text-ink"
            : "border-hairline text-ink hover:border-ink/30",
        ].join(" ")}
      >
        {activeLabel}
        <ChevronDown
          strokeWidth={1.5}
          className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
            className="fixed z-[1000] flex overflow-hidden rounded-xl border border-hairline bg-cream shadow-lg"
          >
            <ul className="max-h-[380px] w-[240px] shrink-0 overflow-y-auto py-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => go(null)}
                  className={[
                    "flex w-full items-center px-4 py-2 text-left font-body text-[14px] transition-colors hover:bg-stone/30",
                    activeSlugPath ? "text-muted" : "text-ink",
                  ].join(" ")}
                >
                  {allLabel}
                </button>
              </li>
              {tree.map((root) => (
                <li key={root.slug} onMouseEnter={() => setHovered(root.slug)}>
                  <button
                    type="button"
                    onClick={() => go(root.slugPath)}
                    className={[
                      "flex w-full items-center justify-between gap-2 px-4 py-2 text-left font-body text-[14px] transition-colors hover:bg-stone/30",
                      activeRoot === root.slug ? "text-ink" : "text-ink/80",
                      shown === root.slug ? "bg-stone/25" : "",
                    ].join(" ")}
                  >
                    <span className="min-w-0 truncate">{root.label}</span>
                    {root.children.length > 0 && (
                      <ChevronRight
                        strokeWidth={1.5}
                        className="h-3.5 w-3.5 shrink-0 text-muted"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* The second column exists only when this taxonomy has depth. */}
            {hasChildren && (
              <ul className="max-h-[380px] w-[220px] overflow-y-auto border-l border-hairline py-1.5">
                {children.length === 0 ? (
                  <li className="px-4 py-2 font-body text-[13px] text-muted">
                    No subcategories
                  </li>
                ) : (
                  children.map((child) => (
                    <li key={child.slugPath}>
                      <button
                        type="button"
                        onClick={() => go(child.slugPath)}
                        className={[
                          "flex w-full items-center px-4 py-2 text-left font-body text-[14px] transition-colors hover:bg-stone/30",
                          activeSlugPath === child.slugPath ? "text-ink" : "text-ink/80",
                        ].join(" ")}
                      >
                        <span className="min-w-0 truncate">{child.label}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

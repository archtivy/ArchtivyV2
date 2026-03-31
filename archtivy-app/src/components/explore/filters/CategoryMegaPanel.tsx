"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { FilterTrigger } from "./FilterTrigger";
import type { TaxonomyTreeNode } from "@/lib/explore/filters/schema";

interface CategoryMegaPanelProps {
  type: "projects" | "products";
  tree: TaxonomyTreeNode[];
  currentSlugPath: string | null;
  queryString: string;
}

const Z_PANEL = 1000;
const Z_BACKDROP = 999;

export function CategoryMegaPanel({ type, tree, currentSlugPath, queryString }: CategoryMegaPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hoveredParent, setHoveredParent] = useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const h = () => updatePos();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  const navigate = (slugPath: string) => {
    setOpen(false);
    const base = type === "projects" ? "/explore/projects" : "/explore/products";
    const qs = queryString ? `?${queryString}` : "";
    router.push(`${base}/${slugPath}${qs}`);
  };

  const clearCategory = () => {
    setOpen(false);
    const base = type === "projects" ? "/explore/projects" : "/explore/products";
    const qs = queryString ? `?${queryString}` : "";
    router.push(`${base}${qs}`);
  };

  const currentLabel = currentSlugPath ? findNodeLabel(tree, currentSlugPath) : null;
  const hasSelection = !!currentSlugPath;
  const displayLabel = currentLabel ?? "Category";

  const activeParent = hoveredParent ?? (tree.length > 0 ? tree[0].id : null);
  const activeChildren = tree.find((n) => n.id === activeParent)?.children ?? [];

  if (tree.length === 0) return null;

  const panel = open && typeof document !== "undefined" ? createPortal(
    <>
      <div className="fixed inset-0" style={{ zIndex: Z_BACKDROP }} aria-hidden onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        className="flex border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: Z_PANEL, borderRadius: 4, minWidth: 440, maxWidth: 580, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
      >
        {/* Left: parent categories */}
        <div className="w-48 shrink-0 border-r border-zinc-100 py-2 dark:border-zinc-800">
          {hasSelection && (
            <button
              type="button"
              onClick={clearCategory}
              className="mb-1 flex w-full items-center px-3.5 py-2 text-left text-[13px] text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              All categories
            </button>
          )}
          {tree.map((node) => {
            const isActive = node.id === activeParent;
            const isCurrent = currentSlugPath === node.slug_path || currentSlugPath?.startsWith(node.slug_path + "/");
            return (
              <button
                key={node.id}
                type="button"
                onMouseEnter={() => setHoveredParent(node.id)}
                onClick={() => navigate(node.slug_path)}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition ${
                  isActive
                    ? "bg-zinc-50 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
                } ${isCurrent ? "font-medium" : ""}`}
              >
                <span className="truncate">{node.label}</span>
                {node.children.length > 0 && (
                  <svg width="5" height="9" viewBox="0 0 5 9" fill="none" className="shrink-0 text-zinc-300 dark:text-zinc-600" aria-hidden>
                    <path d="M1 1l3 3.5L1 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: subcategories */}
        <div className="min-w-0 flex-1 py-2">
          {activeChildren.length === 0 ? (
            <p className="px-3.5 py-3 text-xs text-zinc-400 dark:text-zinc-500">No subcategories</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-1">
              {activeChildren.map((child) => {
                const isCurrent = currentSlugPath === child.slug_path;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => navigate(child.slug_path)}
                    className={`px-3.5 py-2 text-left text-[13px] transition hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                      isCurrent
                        ? "font-medium text-zinc-900 dark:text-zinc-100"
                        : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {child.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <FilterTrigger
        ref={triggerRef}
        label={displayLabel}
        active={hasSelection}
        open={open}
        onClick={() => setOpen((p) => !p)}
      />
      {panel}
    </>
  );
}

function findNodeLabel(tree: TaxonomyTreeNode[], slugPath: string): string | null {
  for (const node of tree) {
    if (node.slug_path === slugPath) return node.label;
    const childResult = findNodeLabel(node.children, slugPath);
    if (childResult) return childResult;
  }
  return null;
}

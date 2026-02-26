"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const PANEL_LINK_PREFIX: Record<string, string> = {
  designers: "/designers",
  "market-leaders": "/designers",
  brands: "/brands",
  projects: "/projects",
  products: "/products",
  categories: "/explore/projects",
  signals: "/explore/projects",
  collaboration: "/explore/projects",
};

export interface PanelRow {
  id: string;
  name: string;
  slug: string | null;
  score?: string;
  growth?: string;
  count?: number;
  metric?: string;
}

export interface SlideOverPanelProps {
  open: boolean;
  panel: string | null;
  title: string;
  subtext?: string;
  city: string | null;
  onClose: () => void;
}

function SkeletonRows() {
  return (
    <ul className="divide-y divide-[#eeeeee] px-5 py-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 py-4">
          <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-zinc-100" />
        </li>
      ))}
    </ul>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M1 1l12 12M13 1L1 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlideOverPanel({
  open,
  panel,
  title,
  subtext,
  city,
  onClose,
}: SlideOverPanelProps) {
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !panel) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("panel", panel);
    if (city) params.set("city", city);
    fetch(`/api/explore/panel?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setRows(data.rows ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, panel, city]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, handleEsc]);

  const linkPrefix = panel ? (PANEL_LINK_PREFIX[panel] ?? null) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-zinc-900/30 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={[
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[#eeeeee] bg-white md:w-[32%] md:min-w-[340px] md:max-w-[480px]",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-[#eeeeee] px-5 py-5">
          <div>
            <div className="mb-2 h-0.5 w-8 bg-[#002abf]" />
            <h2 id="slide-over-title" className="font-serif text-xl font-normal text-zinc-900">
              {title}
            </h2>
            {subtext && <p className="mt-1 text-sm text-zinc-500">{subtext}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf]/30"
            aria-label="Close panel"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonRows />
          ) : rows.length > 0 ? (
            <ul className="divide-y divide-[#eeeeee] px-5 py-2">
              {rows.map((r) => {
                const href =
                  linkPrefix && r.slug ? `${linkPrefix}/${r.slug}` : null;
                const nameEl = href ? (
                  <Link
                    href={href}
                    className="text-sm font-medium text-zinc-900 hover:text-[#002abf]"
                  >
                    {r.name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                );
                const metaParts = [
                  r.score != null ? `Score ${r.score}` : null,
                  r.growth != null ? r.growth : null,
                  r.metric ? r.metric : null,
                  r.count != null ? String(r.count) : null,
                ].filter(Boolean);

                return (
                  <li key={r.id} className="flex flex-col py-3.5">
                    {nameEl}
                    {metaParts.length > 0 && (
                      <span className="mt-0.5 text-xs text-zinc-400">
                        {metaParts.join(" · ")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-10 text-sm text-zinc-400">No results.</p>
          )}
        </div>
      </aside>
    </>
  );
}

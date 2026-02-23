"use client";

import { useCallback, useEffect, useState } from "react";

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
      .then((data) => {
        setRows(data.rows ?? []);
      })
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

  const handleBackdropClick = () => onClose();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-zinc-900/6"
        aria-hidden
        onClick={handleBackdropClick}
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[#eeeeee] bg-white md:w-[32%] md:min-w-[320px] md:max-w-[480px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#eeeeee] px-5 py-4">
          <div>
            <h2 id="slide-over-title" className="font-serif text-xl font-normal text-zinc-900">
              {title}
            </h2>
            {subtext && <p className="mt-1 text-sm text-zinc-600">{subtext}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded p-1 text-2xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf]/30"
            aria-label="Close panel"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="px-5 py-8 text-sm text-zinc-500">Loading…</p>
          ) : rows.length > 0 ? (
            <ul className="divide-y divide-[#eeeeee] px-5 py-2">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {r.score != null && <span>Score {r.score}</span>}
                    {r.growth != null && <span>{r.growth}</span>}
                    {r.count != null && <span>{r.count}</span>}
                    {r.metric && <span>{r.metric}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-sm text-zinc-500">No results.</p>
          )}
        </div>
      </aside>
    </>
  );
}

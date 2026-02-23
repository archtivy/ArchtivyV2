"use client";

import { useCallback, useEffect } from "react";

export interface SlideOverPanelProps {
  open: boolean;
  title: string;
  subtext?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SAMPLE_ROWS: { name: string; score?: string; growth?: string; brands?: number }[] = [
  { name: "Luna Architects", score: "8.4", growth: "+12%", brands: 6 },
  { name: "Atelier Design Studio", score: "7.9", growth: "+8%", brands: 4 },
  { name: "Urban Form Collective", score: "7.2", growth: "+24%", brands: 5 },
  { name: "Material Space", score: "6.8", growth: "+5%", brands: 3 },
  { name: "Studio North", score: "6.5", growth: "+18%", brands: 7 },
  { name: "Landscape Praxis", score: "6.2", growth: "+3%", brands: 2 },
];

export function SlideOverPanel({
  open,
  title,
  subtext,
  onClose,
  children,
}: SlideOverPanelProps) {
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
        className="fixed right-0 top-0 z-50 flex h-full w-[32%] min-w-[320px] max-w-[480px] flex-col border-l border-[#eeeeee] bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-[#eeeeee] px-5 py-4">
          <div>
            <h2 id="slide-over-title" className="font-serif text-xl font-normal text-zinc-900">
              {title}
            </h2>
            {subtext && (
              <p className="mt-1 text-sm text-zinc-600">{subtext}</p>
            )}
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
          {children ?? (
            <ul className="divide-y divide-[#eeeeee] px-5 py-2">
              {SAMPLE_ROWS.map((r, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {r.score && <span>Score {r.score}</span>}
                    {r.growth && <span>{r.growth}</span>}
                    {r.brands != null && <span>{r.brands} brands</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

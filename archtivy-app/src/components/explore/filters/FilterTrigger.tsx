"use client";

import { forwardRef } from "react";

interface FilterTriggerProps {
  label: string;
  active?: boolean;
  open?: boolean;
  onClick: () => void;
}

/**
 * Shared trigger button for all explore filters.
 * Enforces consistent height, radius, typography, and state treatment.
 */
export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger({ label, active = false, open = false, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`inline-flex h-8 items-center gap-1.5 border px-3 text-[13px] font-medium transition-colors ${
          active
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
        }`}
        style={{ borderRadius: 3 }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="truncate">{label}</span>
        <svg
          width="9"
          height="9"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""} ${active ? "text-white/60 dark:text-zinc-900/50" : "text-zinc-400 dark:text-zinc-500"}`}
        >
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }
);

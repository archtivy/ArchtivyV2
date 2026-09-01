"use client";

import { forwardRef } from "react";

interface FilterTriggerProps {
  label: string;
  active?: boolean;
  open?: boolean;
  onClick: () => void;
}

/**
 * The shared filter pill.
 *
 * Restyled off the legacy zinc palette (h-8, 3px radius, zinc borders, dark:
 * variants) onto the editorial tokens the directories actually use. It sits in
 * one row beside the Category pill and the boolean toggles, and at 32px square
 * next to their 40px rounded siblings the row read as two different systems.
 */
export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  function FilterTrigger({ label, active = false, open = false, onClick }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 font-body text-[14px] transition-colors ${
          active
            ? "border-ink bg-ink text-cream"
            : "border-hairline text-ink hover:border-ink/30"
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="truncate">{label}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""} ${active ? "text-cream/60" : "text-muted"}`}
        >
          <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    );
  }
);

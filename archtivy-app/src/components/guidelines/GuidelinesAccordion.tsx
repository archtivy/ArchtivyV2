"use client";

import * as React from "react";

export interface GuidelinesItem {
  title: string;
  content: string;
}

export function GuidelinesAccordion({ items }: { items: GuidelinesItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className="overflow-hidden border bg-[#fafafa]"
            style={{ borderRadius: 4, borderColor: "#eeeeee" }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="flex w-full items-center justify-between px-4 py-4 text-left sm:px-6 sm:py-5"
              aria-expanded={isOpen}
            >
              <span className="font-serif text-base font-medium text-zinc-900 sm:text-lg dark:text-zinc-100">
                {item.title}
              </span>
              <span
                className="ml-2 shrink-0 text-zinc-400 transition-transform"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                aria-hidden
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <div
                className="border-t px-4 pb-4 pt-0 sm:px-6 sm:pb-5"
                style={{ borderColor: "#eeeeee" }}
              >
                <p className="font-sans text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.content}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

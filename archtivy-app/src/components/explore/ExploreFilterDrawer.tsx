"use client";

import { useState } from "react";

export function ExploreFilterDrawer({
  children,
  panel,
}: {
  children: React.ReactNode;
  panel: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Mobile: Filters button */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-[20px] border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Filters
        </button>
      </div>
      {/* Desktop: sidebar */}
      <div className="hidden w-64 shrink-0 lg:block">{panel}</div>
      {/* Mobile: drawer overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-auto border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            {panel}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-[20px] border border-zinc-200 py-2 text-sm font-medium dark:border-zinc-700"
            >
              Close
            </button>
          </div>
        </>
      )}
      {/* Main content */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

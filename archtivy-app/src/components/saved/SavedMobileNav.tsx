"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SavedSidebar } from "@/components/saved/SavedSidebar";
import type { SavedParams } from "@/lib/saved/params";
import type { SavedBoard } from "@/lib/db/savedLibrary";

/**
 * The rail as a sheet, below `lg`.
 *
 * Below 1024 a 264px permanent rail would leave a 1024-wide tablet about 700px
 * for the grid and a phone essentially nothing, so the same SavedSidebar moves
 * into a drawer rather than being reimplemented as a second, narrower nav. It
 * carries everything the desktop rail does — type navigation with counts,
 * boards, and New board — because they are literally the same component.
 *
 * Every row inside is a link, so selecting one navigates and the sheet goes
 * with the page. That is also why there is no explicit onClose plumbing.
 */
export function SavedMobileNav({
  params,
  boards,
  counts,
}: {
  params: SavedParams;
  boards: SavedBoard[];
  counts: { all: number; project: number; product: number };
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-cream px-4 font-body text-[13px] text-ink transition-colors hover:border-ink/30"
      >
        <SlidersHorizontal strokeWidth={1.5} className="h-4 w-4" aria-hidden />
        Library
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close library navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div
            role="dialog"
            aria-label="Saved library"
            className="relative ml-0 flex h-full w-[86%] max-w-[320px] flex-col overflow-y-auto border-r border-hairline bg-cream p-5"
          >
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink"
              >
                <X strokeWidth={1.5} className="h-4 w-4" />
              </button>
            </div>
            <SavedSidebar params={params} boards={boards} counts={counts} />
          </div>
        </div>
      )}
    </div>
  );
}

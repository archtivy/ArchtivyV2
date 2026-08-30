"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilesSidebar, type FacetValue } from "@/components/files/FilesSidebar";
import type { FilesParams } from "@/lib/files/params";

/**
 * The rail as a sheet, below `lg`. The same FilesSidebar, not a second nav —
 * a 264px permanent rail would leave a phone almost nothing for the table.
 * Every row inside is a link, so selecting one navigates and the sheet closes
 * with the page.
 */
export function FilesMobileNav(props: {
  params: FilesParams;
  total: number;
  recentCount: number;
  formats: FacetValue[];
  sources: FacetValue[];
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
        Filters
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div
            role="dialog"
            aria-label="File filters"
            className="relative flex h-full w-[86%] max-w-[320px] flex-col overflow-y-auto border-r border-hairline bg-cream p-5"
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
            <FilesSidebar {...props} />
          </div>
        </div>
      )}
    </div>
  );
}

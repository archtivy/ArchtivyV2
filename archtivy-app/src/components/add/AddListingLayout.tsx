"use client";

import type { ReactNode } from "react";

export interface AddListingLayoutProps {
  /** Left column: form content */
  children: ReactNode;
  /** Right column (desktop): sticky panel with checklist + actions */
  sidebar: ReactNode;
  /** Mobile: sticky bottom bar (e.g. Save Draft + Publish) */
  mobileActions: ReactNode;
  /** Optional class for the outer container */
  className?: string;
}

export function AddListingLayout({
  children,
  sidebar,
  mobileActions,
  className = "",
}: AddListingLayoutProps) {
  return (
    <div className={`add-listing-layout ${className}`.trim()}>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-10">
        <div className="min-w-0">{children}</div>
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-6">{sidebar}</div>
        </aside>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
        {mobileActions}
      </div>
      {/* Spacer so content isn't hidden behind fixed sticky footer */}
      <div className="h-24" aria-hidden />
    </div>
  );
}

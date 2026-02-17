"use client";

import { useCallback, useState } from "react";
import { toggleBookmark } from "@/app/actions/galleryBookmarks";
import { track } from "@/lib/events";
import { ConnectionsLabel } from "./connectionsLabel";

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export interface DetailHeaderBarProps {
  entityType: "project" | "product";
  entityId: string;
  currentPath: string;
  isSaved: boolean;
  /** For project: location line "City, Country". For product: undefined to hide. */
  locationLine?: string | null;
  /** For product: brand name + href. For project: undefined. */
  brandLine?: { name: string; href: string } | null;
  /** Total connection count (linked products for project, linked projects for product). Shown as "X connections" when > 0. */
  connectionCount?: number | null;
}

export function DetailHeaderBar({
  entityType,
  entityId,
  currentPath,
  isSaved: initialSaved,
  locationLine,
  brandLine,
  connectionCount,
}: DetailHeaderBarProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pendingSave, setPendingSave] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleSave = useCallback(async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setPendingSave(true);
    try {
      const result = await toggleBookmark(entityType, entityId, currentPath);
      if (result.error) setSaved(!nextSaved);
    } finally {
      setPendingSave(false);
    }
  }, [entityType, entityId, currentPath, saved]);

  const handleShare = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    void navigator.clipboard?.writeText(url).then(() => {
      track("listing_share", { listingId: entityId });
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    });
  }, [entityId]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pendingSave}
          aria-label={saved ? "Unsave" : "Save"}
          className="inline-flex items-center gap-1.5 rounded-[20px] border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          <FolderIcon className="h-4 w-4" />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className="inline-flex items-center gap-1.5 rounded-[20px] border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          <ShareIcon className="h-4 w-4" />
          Share
        </button>
        {shareToast && (
          <span role="status" className="text-sm text-zinc-500 dark:text-zinc-400">
            Link copied
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        {locationLine?.trim() && (
          <span className="flex items-center gap-2">
            <LocationIcon className="h-4 w-4 shrink-0" />
            {locationLine.trim()}
          </span>
        )}
        {brandLine && (
          <a
            href={brandLine.href}
            className="font-medium text-archtivy-primary hover:underline dark:text-archtivy-primary"
          >
            {brandLine.name}
          </a>
        )}
        <ConnectionsLabel count={connectionCount} />
      </div>
    </div>
  );
}

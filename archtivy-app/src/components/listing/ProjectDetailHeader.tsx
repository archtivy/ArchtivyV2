"use client";

import { useCallback, useState } from "react";
import { toggleBookmark } from "@/app/actions/galleryBookmarks";
import { track } from "@/lib/events";

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

function BookmarkIcon({ className }: { className?: string }) {
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
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

export interface ProjectDetailHeaderProps {
  title: string;
  entityId: string;
  currentPath: string;
  isSaved: boolean;
}

export function ProjectDetailHeader({
  title,
  metadataLine,
  entityId,
  currentPath,
  isSaved: initialSaved,
}: ProjectDetailHeaderProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pendingSave, setPendingSave] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleSave = useCallback(async () => {
    const nextSaved = !saved;
    setSaved(nextSaved);
    setPendingSave(true);
    try {
      const result = await toggleBookmark("project", entityId, currentPath);
      if (result.error) setSaved(!nextSaved);
    } finally {
      setPendingSave(false);
    }
  }, [entityId, currentPath, saved]);

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
    <header className="flex flex-wrap items-start justify-between gap-6 pt-4 pb-4">
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-[#111827] dark:text-zinc-100 md:text-4xl lg:text-[2.5rem]">
          {title}
        </h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={pendingSave}
          aria-label={saved ? "Unsave project" : "Save project"}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          <BookmarkIcon className="h-4 w-4" />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
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
    </header>
  );
}

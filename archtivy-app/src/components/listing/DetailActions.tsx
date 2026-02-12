"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { addToSaved, removeFromSaved } from "@/app/actions/saves";
import { track } from "@/lib/events";

/** Folder icon (collection style, not heart/star). */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
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
      width="20"
      height="20"
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

interface DetailActionsProps {
  listingId: string;
  isSaved: boolean;
}

/** Fallback: copy via hidden textarea + execCommand when Clipboard API is denied. */
function copyViaExecCommand(text: string): boolean {
  if (typeof document === "undefined" || typeof window === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
  return ok;
}

export function DetailActions({ listingId, isSaved }: DetailActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [copyToast, setCopyToast] = useState<"" | "Copied" | "Copy failed — please copy manually">("");

  useEffect(() => {
    if (!copyToast) return;
    const t = setTimeout(() => setCopyToast(""), 3000);
    return () => clearTimeout(t);
  }, [copyToast]);

  const handleSave = () => {
    startTransition(async () => {
      const action = isSaved ? removeFromSaved : addToSaved;
      const result = await action(listingId);
      if (result?.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  };

  const copyUrl = useCallback(async (url: string): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }
    } catch {
      // NotAllowedError or other: try fallback
    }
    return copyViaExecCommand(url);
  }, []);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url,
        });
        track("listing_share", { listingId });
        return;
      } catch {
        // Fall through to copy
      }
    }
    try {
      const ok = await copyUrl(url);
      if (ok) track("listing_share", { listingId });
      setCopyToast(ok ? "Copied" : "Copy failed — please copy manually");
    } catch {
      setCopyToast("Copy failed — please copy manually");
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {copyToast && (
        <span
          role="status"
          className="absolute -top-10 left-1/2 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          {copyToast}
        </span>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        aria-label={isSaved ? "Remove from saved" : "Save"}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
      >
        <FolderIcon className="h-5 w-5" />
        {isSaved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
      >
        <ShareIcon className="h-5 w-5" />
        Share
      </button>
    </div>
  );
}

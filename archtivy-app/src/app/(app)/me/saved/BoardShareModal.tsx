"use client";

import * as React from "react";
import { setBoardVisibility } from "@/app/actions/savedFolders";
import type { FolderWithMeta } from "@/lib/savedFoldersConstants";

export function BoardShareModal({
  folder,
  onClose,
  onVisibilityChange,
}: {
  folder: FolderWithMeta;
  onClose: () => void;
  onVisibilityChange?: (folderId: string, isPublic: boolean, shareSlug: string | null) => void;
}) {
  const [isPublic, setIsPublic] = React.useState(folder.is_public);
  const [shareSlug, setShareSlug] = React.useState<string | null>(folder.share_slug);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const shareUrl =
    typeof window !== "undefined" && shareSlug
      ? `${window.location.origin}/saved/boards/${shareSlug}`
      : "";

  const handleToggle = async () => {
    setBusy(true);
    setError(null);
    const result = await setBoardVisibility(folder.id, !isPublic);
    setBusy(false);
    if (result.ok === true && result.data) {
      setIsPublic(!isPublic);
      setShareSlug(result.data.share_slug);
      onVisibilityChange?.(folder.id, !isPublic, result.data.share_slug);
    } else {
      setError(result && result.ok === false ? result.error : "Failed to update");
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        style={{ borderRadius: "4px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="share-modal-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Share board
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            style={{ borderRadius: "4px" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="mt-1 truncate text-sm text-zinc-500 dark:text-zinc-400">{folder.name}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Public board</span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            disabled={busy}
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#002abf] ${
              isPublic ? "bg-[#002abf]" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
            style={{ borderRadius: "9999px" }}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                isPublic ? "translate-x-5" : "translate-x-1"
              }`}
              style={{ borderRadius: "9999px" }}
            />
          </button>
        </div>

        {isPublic && shareSlug && (
          <div className="mt-4">
            <label htmlFor="share-url" className="sr-only">
              Shareable link
            </label>
            <div className="flex gap-2">
              <input
                id="share-url"
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                style={{ borderRadius: "4px" }}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="rounded bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:bg-[#0022a0] focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                style={{ borderRadius: "4px" }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        {!isPublic && (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            Make this board public to get a shareable link.
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

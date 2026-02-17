"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { listFoldersWithMeta, createFolder } from "@/app/actions/savedFolders";
import { FOLDERS_SETUP_ERROR, type FolderWithMeta } from "@/lib/savedFoldersConstants";
import { BoardShareModal } from "./BoardShareModal";

function formatUpdated(updatedAt: string | null): string {
  if (!updatedAt) return "";
  const d = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function SavedBoardsSection() {
  const [folders, setFolders] = React.useState<FolderWithMeta[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shareFolder, setShareFolder] = React.useState<FolderWithMeta | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await listFoldersWithMeta();
    setLoading(false);
    if (result.ok === true) setFolders(result.data ?? []);
    else setError(result.error ?? "Failed to load boards");
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    const result = await createFolder(name);
    setCreating(false);
    if (!result || result.ok !== true) {
      setError(result?.error ?? "Failed to create folder");
      return;
    }
    setFolders((prev) => [
      ...prev,
      {
        ...result.data!,
        item_count: 0,
        cover_image_url: null,
        updated_at: null,
        is_public: false,
        share_slug: null,
      },
    ]);
    setNewName("");
    setShowCreate(false);
  };

  const handleVisibilityChange = (folderId: string, isPublic: boolean, shareSlug: string | null) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId ? { ...f, is_public: isPublic, share_slug: shareSlug } : f
      )
    );
    if (shareFolder?.id === folderId) {
      setShareFolder((f) => (f ? { ...f, is_public: isPublic, share_slug: shareSlug } : null));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Organize saved items into boards. Click a board to view its items.
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:border-[#002abf] hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          style={{ borderRadius: "4px" }}
        >
          + Create folder
        </button>
      </div>

      {error && (
        <div role="alert">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error === "Not signed in"
              ? "Please sign in to view or create boards."
              : error === FOLDERS_SETUP_ERROR
                ? "Saved boards are not set up yet. Ask an admin to run the database migration (docs/saved-folders-tables.sql), then reload the schema cache in Supabase."
                : error}
          </p>
          {error === "Not signed in" && (
            <a
              href="/sign-in"
              className="mt-2 inline-block text-sm font-medium text-[#002abf] hover:underline"
            >
              Sign in
            </a>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading boards…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" aria-label="Saved boards">
          {folders.map((folder) => (
            <li key={folder.id} className="group">
              <div
                className="relative block overflow-hidden rounded border border-zinc-200 bg-white shadow-sm transition hover:border-[#002abf] hover:shadow-md focus-within:ring-2 focus-within:ring-[#002abf] dark:border-zinc-800 dark:bg-zinc-900"
                style={{ borderRadius: "4px" }}
              >
                <Link
                  href={`/me/saved/folder/${folder.id}`}
                  className="block"
                  tabIndex={0}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {folder.cover_image_url ? (
                      <Image
                        src={folder.cover_image_url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={folder.cover_image_url.startsWith("http")}
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <span className="text-2xl">—</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                      {folder.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {folder.item_count} item{folder.item_count !== 1 ? "s" : ""}
                      {folder.updated_at ? ` · Updated ${formatUpdated(folder.updated_at)}` : ""}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShareFolder(folder);
                  }}
                  className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1.5 text-xs font-medium text-zinc-800 shadow opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:bg-zinc-800/90 dark:text-zinc-200"
                  style={{ borderRadius: "4px" }}
                  aria-label={`Share board ${folder.name}`}
                >
                  Share
                </button>
              </div>
            </li>
          ))}
          {showCreate ? (
            <li>
              <div className="overflow-hidden rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/50" style={{ borderRadius: "4px" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Board name (max 40)"
                  maxLength={40}
                  className="mb-3 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  style={{ borderRadius: "4px" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setNewName(""); }}
                    className="rounded px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400"
                    style={{ borderRadius: "4px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="rounded bg-[#002abf] px-2 py-1 text-sm font-medium text-white hover:bg-[#0022a0] disabled:opacity-50"
                    style={{ borderRadius: "4px" }}
                  >
                    {creating ? "Creating…" : "Create"}
                  </button>
                </div>
              </div>
            </li>
          ) : (
            <li>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition hover:border-[#002abf] hover:bg-zinc-100 hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:border-zinc-700 dark:bg-zinc-800/50 dark:hover:border-[#002abf] dark:hover:bg-zinc-800"
                style={{ borderRadius: "4px" }}
              >
                <span className="text-2xl">+</span>
                <span className="text-sm font-medium">Create board</span>
              </button>
            </li>
          )}
        </ul>
      )}

      {shareFolder && (
        <BoardShareModal
          folder={shareFolder}
          onClose={() => setShareFolder(null)}
          onVisibilityChange={handleVisibilityChange}
        />
      )}
    </div>
  );
}

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
        <p className="text-sm text-muted">
          Organize saved items into boards. Click a board to view its items.
        </p>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-full bg-ink px-4 py-2 font-body text-[14px] text-cream transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          style={{ borderRadius: "4px" }}
        >
          + Create folder
        </button>
      </div>

      {error && (
        <div role="alert">
          <p className="text-sm text-red-600">
            {error === "Not signed in"
              ? "Please sign in to view or create boards."
              : error === FOLDERS_SETUP_ERROR
                ? "Saved boards are not set up yet. Ask an admin to run the database migration (docs/saved-folders-tables.sql), then reload the schema cache in Supabase."
                : error}
          </p>
          {error === "Not signed in" && (
            <a
              href="/sign-in"
              className="mt-2 inline-block text-sm font-medium text-ink hover:underline"
            >
              Sign in
            </a>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading boards…</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" aria-label="Saved boards">
          {folders.map((folder) => (
            <li key={folder.id} className="group">
              <div
                className="relative block overflow-hidden rounded border border-hairline bg-cream shadow-sm transition hover:border-ink hover:shadow-md focus-within:ring-2 focus-within:ring-ink"
                style={{ borderRadius: "4px" }}
              >
                <Link
                  href={`/me/saved/folder/${folder.id}`}
                  className="block"
                  tabIndex={0}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone/60">
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
                      <div className="flex h-full w-full items-center justify-center text-muted">
                        <span className="text-2xl">—</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium text-ink">
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted">
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
                  className="absolute right-2 top-2 rounded bg-cream/90 px-2 py-1.5 text-xs font-medium text-ink shadow opacity-0 transition group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ink"
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
              <div className="overflow-hidden rounded border border-hairline bg-stone/40 p-4" style={{ borderRadius: "4px" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Board name (max 40)"
                  maxLength={40}
                  className="mb-3 w-full rounded border border-hairline bg-cream px-3 py-2 text-sm"
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
                    className="rounded px-2 py-1 text-sm text-muted"
                    style={{ borderRadius: "4px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                    className="rounded bg-ink px-2 py-1 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
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
                className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-hairline bg-stone/40 text-muted transition hover:border-ink hover:bg-stone/60 hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink"
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

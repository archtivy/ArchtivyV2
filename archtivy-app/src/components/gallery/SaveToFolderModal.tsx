"use client";

import * as React from "react";
import Image from "next/image";
import { listFoldersWithMeta, createFolder, getFolderIdsForEntity, saveToFolders } from "@/app/actions/savedFolders";
import { FOLDERS_SETUP_ERROR, type FolderWithMeta } from "@/lib/savedFoldersConstants";

export interface SaveToFolderModalProps {
  entityType: "project" | "product";
  entityId: string;
  entityTitle: string;
  currentPath: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveToFolderModal({
  entityType,
  entityId,
  entityTitle,
  currentPath,
  open,
  onClose,
  onSaved,
}: SaveToFolderModalProps) {
  const [folders, setFolders] = React.useState<FolderWithMeta[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadFolders = React.useCallback(async () => {
    const result = await listFoldersWithMeta();
    if (result.ok !== true) {
      setError(result.error ?? "Failed to load folders");
      setFolders([]);
      return;
    }
    setFolders(result.data ?? []);
  }, []);

  const loadInitialSelection = React.useCallback(async () => {
    const result = await getFolderIdsForEntity(entityType, entityId);
    if (result.ok !== true) return;
    setSelectedIds(new Set(result.data ?? []));
  }, [entityType, entityId]);

  React.useEffect(() => {
    if (open) {
      setError(null);
      setShowNewForm(false);
      setNewFolderName("");
      setLoading(true);
      listFoldersWithMeta().then((result) => {
        setLoading(false);
        if (result.ok === true) setFolders(result.data ?? []);
        else setError(result.error ?? "Failed to load");
      });
      getFolderIdsForEntity(entityType, entityId).then((result) => {
        if (result.ok === true) setSelectedIds(new Set(result.data ?? []));
      });
    }
  }, [open, entityType, entityId]);

  const toggleFolder = (folderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    const result = await createFolder(name);
    setCreating(false);
    if (!result || result.ok !== true) {
      setError(result?.error ?? "Failed to create folder");
      return;
    }
    const created = result.data;
    if (created) {
      setFolders((prev) => [
        ...prev,
        {
          ...created,
          item_count: 0,
          cover_image_url: null,
          updated_at: null,
          is_public: false,
          share_slug: null,
        },
      ]);
      setSelectedIds((prev) => new Set(prev).add(created.id));
    }
    setNewFolderName("");
    setShowNewForm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await saveToFolders(entityType, entityId, Array.from(selectedIds), currentPath);
    setSaving(false);
    if (!result || result.ok !== true) {
      setError(result?.error ?? "Failed to save");
      return;
    }
    onSaved?.();
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-to-folder-title"
    >
      <div
        className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
        style={{ borderRadius: "4px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-zinc-800 p-4">
          <h2 id="save-to-folder-title" className="text-lg font-semibold text-zinc-100">
            Save to folder
          </h2>
          <p className="mt-1 truncate text-sm text-zinc-400">{entityTitle}</p>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Save to:
          </p>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading folders…</p>
          ) : (
            <ul className="space-y-2" role="list">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded border p-2.5 transition hover:border-[#002abf]/60 focus-within:ring-2 focus-within:ring-[#002abf] ${
                      selectedIds.has(folder.id) ? "border-[#002abf]/80 bg-zinc-800/60" : "border-zinc-700/80 bg-zinc-800/40"
                    }`}
                    style={{ borderRadius: "4px" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(folder.id)}
                      onChange={() => toggleFolder(folder.id)}
                      className="h-4 w-4 rounded border-zinc-600 text-[#002abf] focus:ring-[#002abf]"
                    />
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-800" style={{ borderRadius: "4px" }}>
                      {folder.cover_image_url ? (
                        <Image
                          src={folder.cover_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={folder.cover_image_url.startsWith("http")}
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-500">
                          <span className="text-xs">—</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-200">{folder.name}</span>
                      <span className="text-xs text-zinc-500">{folder.item_count} item{folder.item_count !== 1 ? "s" : ""}</span>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {showNewForm ? (
            <div className="mt-4 flex flex-col gap-2 rounded border border-zinc-700 bg-zinc-800/50 p-3" style={{ borderRadius: "4px" }}>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name (max 40 characters)"
                maxLength={40}
                className="rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf]"
                style={{ borderRadius: "4px" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateFolder();
                  if (e.key === "Escape") setShowNewForm(false);
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewForm(false); setNewFolderName(""); }}
                  className="rounded px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
                  style={{ borderRadius: "4px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateFolder}
                  disabled={creating || !newFolderName.trim()}
                  className="rounded bg-[#002abf] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0022a0] focus:outline-none focus:ring-2 focus:ring-[#002abf] disabled:opacity-50"
                  style={{ borderRadius: "4px" }}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNewForm(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-dashed border-zinc-600 py-3 text-sm font-medium text-zinc-400 hover:border-[#002abf] hover:bg-zinc-800/50 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
              style={{ borderRadius: "4px" }}
            >
              + New folder
            </button>
          )}

          {error && (
            <div className="mt-3" role="alert">
              <p className="text-sm text-red-400">
                {error === "Not signed in"
                  ? "Please sign in to create or save to folders."
                  : error === FOLDERS_SETUP_ERROR
                    ? "Saved boards are not set up yet. Ask an admin to run the database migration, then reload the schema cache."
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
        </div>
        <div className="flex justify-end gap-2 border-t border-zinc-800 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#002abf]"
            style={{ borderRadius: "4px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-[#002abf] px-4 py-2 text-sm font-medium text-white hover:bg-[#0022a0] focus:outline-none focus:ring-2 focus:ring-[#002abf] disabled:opacity-50"
            style={{ borderRadius: "4px" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

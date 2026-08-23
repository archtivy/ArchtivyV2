"use client";

import * as React from "react";
import Image from "next/image";
import {
  listFoldersWithMeta,
  createFolder,
  getFolderIdsForEntity,
  saveToFolders,
} from "@/app/actions/savedFolders";
import { FOLDERS_SETUP_ERROR, type FolderWithMeta } from "@/lib/savedFoldersConstants";

/**
 * The board picker body — one implementation, two shells.
 *
 * ── WHY THE BODY IS SEPARATE FROM THE SHELL ─────────────────────────────────
 * Saving now happens from two shapes of UI: an anchored popover on the detail
 * pages and cards (SaveToBoardPopover) and the older centred dialog on project
 * cards (SaveToFolderModal). Those differ only in how they are positioned and
 * dismissed. Everything that matters — loading boards, reflecting which ones
 * already hold this item, creating a board, and writing folder_items — is here
 * so the two cannot drift into behaving differently.
 *
 * ── FIRST SAVE MUST NOT BE A NAMING TASK ────────────────────────────────────
 * Someone with no boards yet pressed Save to save something, not to design a
 * filing system. Showing them an empty list and a "name your board" field
 * makes the first save the hardest one. Instead the name "Saved" is pre-filled
 * and editable, and the board is created on confirm — so the default path is
 * one click and renaming stays available for anyone who wants it.
 */

const DEFAULT_BOARD_NAME = "Saved";

export interface BoardPickerPanelProps {
  entityType: "project" | "product";
  entityId: string;
  entityTitle: string;
  /** Where to return after sign-in, when a signed-out user reaches this. */
  currentPath: string;
  onClose: () => void;
  /** Fired after a successful write, with whether the item is now on any board. */
  onSaved?: (saved: boolean) => void;
}

export function BoardPickerPanel({
  entityType,
  entityId,
  entityTitle,
  currentPath,
  onClose,
  onSaved,
}: BoardPickerPanelProps) {
  const [folders, setFolders] = React.useState<FolderWithMeta[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [newName, setNewName] = React.useState("");
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const [foldersRes, selectionRes] = await Promise.all([
        listFoldersWithMeta(),
        getFolderIdsForEntity(entityType, entityId),
      ]);
      if (cancelled) return;

      setLoading(false);
      if (!foldersRes.ok) {
        setError(foldersRes.error);
        return;
      }
      const list = foldersRes.data ?? [];
      setFolders(list);
      if (selectionRes.ok) setSelectedIds(new Set(selectionRes.data ?? []));

      // No boards yet: open straight into the create form with a usable name
      // already filled in, rather than showing an empty list.
      if (list.length === 0) {
        setShowNewForm(true);
        setNewName(DEFAULT_BOARD_NAME);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  const toggle = (folderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  /** Create a board and select it. Returns its id, or null on failure. */
  async function createAndSelect(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    setCreating(true);
    setError(null);
    const result = await createFolder(trimmed);
    setCreating(false);
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    const created = result.data;
    if (!created) {
      setError("Failed to create board");
      return null;
    }
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
    setNewName("");
    setShowNewForm(false);
    return created.id;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    // A pending board name counts as intent to create it. Requiring "Create"
    // and then "Save" would make the first save two clicks for no reason.
    let ids = Array.from(selectedIds);
    if (showNewForm && newName.trim()) {
      const createdId = await createAndSelect(newName);
      if (!createdId) {
        setSaving(false);
        return;
      }
      ids = [...ids, createdId];
    }

    const result = await saveToFolders(entityType, entityId, ids, currentPath);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved?.(ids.length > 0);
    onClose();
  }

  const hasPendingNew = showNewForm && newName.trim().length > 0;
  const canSave = selectedIds.size > 0 || hasPendingNew;

  return (
    <div className="flex flex-col">
      <div className="border-b border-hairline px-4 py-3">
        <p className="font-body text-[12px] uppercase tracking-[0.14em] text-muted">Save to board</p>
        <p className="mt-1 truncate font-body text-[14px] text-ink">{entityTitle}</p>
      </div>

      <div className="max-h-[300px] overflow-auto p-3">
        {loading ? (
          <p className="px-1 py-2 font-body text-[13px] text-muted">Loading boards…</p>
        ) : (
          <ul className="space-y-1" role="list">
            {folders.map((folder) => {
              const on = selectedIds.has(folder.id);
              return (
                <li key={folder.id}>
                  <label
                    className={[
                      "flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors",
                      on ? "bg-stone/60" : "hover:bg-stone/40",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(folder.id)}
                      className="h-4 w-4 rounded border-ink/30 text-ink focus:ring-ink/20"
                    />
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-stone">
                      {folder.cover_image_url && (
                        <Image
                          src={folder.cover_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized={folder.cover_image_url.startsWith("http")}
                          sizes="36px"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-[14px] text-ink">
                        {folder.name}
                      </span>
                      <span className="font-body text-[12px] text-muted">
                        {folder.item_count} item{folder.item_count !== 1 ? "s" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {!loading &&
          (showNewForm ? (
            <div className="mt-2 space-y-2 rounded-lg border border-hairline p-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Board name"
                maxLength={40}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleSave();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setShowNewForm(false);
                    setNewName("");
                  }
                }}
                className="w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[14px] text-ink placeholder:text-muted focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/5"
              />
              {folders.length === 0 && (
                <p className="font-body text-[12px] leading-[17px] text-muted">
                  Your first board. Keep the name or change it — it’s created when you save.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowNewForm(true);
                setNewName("");
              }}
              className="mt-2 w-full rounded-lg border border-dashed border-ink/25 py-2.5 font-body text-[13px] text-muted transition-colors hover:border-ink/40 hover:text-ink"
            >
              + New board
            </button>
          ))}

        {error && (
          <div className="mt-3" role="alert">
            <p className="font-body text-[13px] text-red-700">
              {error === "Not signed in"
                ? "Please sign in to save."
                : error === FOLDERS_SETUP_ERROR
                  ? "Saved boards aren’t set up yet. Ask an admin to run the database migration."
                  : error}
            </p>
            {error === "Not signed in" && (
              <a
                href={`/sign-in?redirect_url=${encodeURIComponent(currentPath)}`}
                className="mt-1 inline-block font-body text-[13px] text-ink underline"
              >
                Sign in
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-hairline px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-3 py-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || creating || !canSave}
          className="rounded-full bg-ink px-4 py-1.5 font-body text-[13px] text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving || creating ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

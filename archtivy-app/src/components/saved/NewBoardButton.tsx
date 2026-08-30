"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createFolder } from "@/app/actions/savedFolders";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";

/**
 * "+ New Board" — an inline name field over the EXISTING createFolder action.
 *
 * No new backend and no second creation path: this is the same server action
 * SavedBoardsSection has always called, with the same validation behind it
 * (required, max 40, case-insensitive duplicate rejected). Only the affordance
 * is new, because the rail needs one where the old grid had a card.
 *
 * router.refresh() rather than local state: the board list, the item counts and
 * the grid are all server-rendered from one query, so re-running that query is
 * what keeps them consistent. Optimistically inserting a row here would leave
 * the counts beside it stale.
 */
export function NewBoardButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await createFolder(trimmed);
      if (result.ok !== true) {
        setError(result.error ?? "Could not create the board.");
        return;
      }
      setName("");
      setError(null);
      setOpen(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-0 py-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
      >
        <Plus strokeWidth={1.5} className="h-4 w-4 shrink-0" aria-hidden />
        New board
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="pb-1">
      <label htmlFor="new-board-name" className="sr-only">
        Board name
      </label>
      <input
        id="new-board-name"
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setError(null);
          }
        }}
        placeholder="Board name"
        className="w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
      />
      {error && <p className="mt-1.5 font-body text-[12px] text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className={`${BTN_PILL_SECONDARY} h-8 px-3`}
        >
          {pending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="font-body text-[13px] text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

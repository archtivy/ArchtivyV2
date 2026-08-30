"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createFolder } from "@/app/actions/savedFolders";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";

/**
 * "New board" — a name field over the EXISTING createFolder action.
 *
 * No new backend and no second creation path: this is the same server action
 * the old SavedBoardsSection called, with the same validation behind it
 * (required, max 40, case-insensitive duplicate rejected). Only the affordance
 * is new, because the workspace needs one in two places where the old grid had
 * a single card.
 *
 * ── TWO SHAPES, ONE COMPONENT ───────────────────────────────────────────────
 *   inline   the "+ New" beside the rail's BOARDS heading
 *   card     the dashed tile at the end of the boards preview row
 *
 * Both open the same anchored panel rather than a modal. A modal would be a
 * third dialog pattern on a page that already has BoardShareModal and the save
 * popover, and this is a one-field form.
 *
 * router.refresh() rather than local state: the board list, the item counts,
 * the preview row and the grid are all server-rendered from one query, so
 * re-running that query is what keeps them consistent. Optimistically inserting
 * a row here would leave every count beside it stale.
 */
export function NewBoardButton({
  variant = "inline",
}: {
  variant?: "inline" | "card";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape, so an abandoned panel never sits open over the grid.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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

  const panel = open && (
    <form
      onSubmit={submit}
      className={[
        "absolute z-30 w-[248px] rounded-xl border border-hairline bg-cream p-3",
        "shadow-[0_8px_24px_rgba(22,22,22,0.10)]",
        variant === "card" ? "left-0 top-full mt-2" : "right-0 top-full mt-2",
      ].join(" ")}
    >
      <label htmlFor={`new-board-${variant}`} className="sr-only">
        Board name
      </label>
      <input
        id={`new-board-${variant}`}
        autoFocus
        value={name}
        maxLength={40}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        placeholder="Board name"
        className="w-full rounded-lg border border-hairline bg-cream px-3 py-2 font-body text-[13px] text-ink placeholder:text-muted focus:border-ink/30 focus:outline-none"
      />
      {error && <p className="mt-1.5 font-body text-[12px] text-red-600">{error}</p>}
      <div className="mt-2 flex items-center gap-2">
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

  if (variant === "card") {
    return (
      <div ref={wrapRef} className="relative h-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-hairline text-muted transition-colors hover:border-ink/30 hover:text-ink"
        >
          <Plus strokeWidth={1.5} className="h-5 w-5" aria-hidden />
          <span className="font-body text-[13px]">New board</span>
        </button>
        {panel}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 font-body text-[12px] text-muted transition-colors hover:text-ink"
      >
        <Plus strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        New
      </button>
      {panel}
    </div>
  );
}

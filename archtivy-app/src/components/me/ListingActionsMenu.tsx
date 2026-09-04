"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { deleteListing } from "@/app/actions/listings";
import { setListingStatusAction } from "@/app/actions/listingStatus";
import { getListingUrl } from "@/lib/canonical";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

/**
 * The ••• overflow menu on a workspace listing card or row.
 *
 * ── ONLY ACTIONS THAT EXIST ─────────────────────────────────────────────────
 * View · Publish / Move to draft · Edit · Promote · Delete.
 *
 * The status item used to be absent, and the reason was recorded here: no code
 * path moved a row back from APPROVED to DRAFT, so the item would have been a
 * button that did nothing. `setListingStatusAction` is that path, so the item
 * is real now. It writes the SAME `listings.status` column every public read
 * already filters on — there is no second status field, and DRAFT/APPROVED are
 * still the only two values in play.
 *
 * "Published" is the word in the menu; APPROVED is the value in the column.
 * The internal name is a moderation term and stays internal.
 *
 * Promote is shown only for APPROVED listings — a draft has no public page to
 * send traffic to — and links into the REAL promotion flow at /me/tools with
 * the listing preselected. It creates nothing by itself.
 *
 * Delete reuses the existing owner-guarded server action and the shared
 * ConfirmDialog; nothing about deletion is reimplemented here.
 */
export function ListingActionsMenu({
  listingId,
  listingType,
  listingTitle,
  listingSlug,
  isDraft,
}: {
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
  listingSlug?: string | null;
  isDraft: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [draftConfirmOpen, setDraftConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. Both, because a menu that only
  // closes one way strands keyboard users with it open over the content.
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

  const publicHref = getListingUrl({
    id: listingId,
    type: listingType,
    slug: listingSlug ?? undefined,
  });

  /*
   * Publishing is immediate; un-publishing asks first.
   *
   * The asymmetry is deliberate. Making something live is additive and
   * trivially reversible by the item directly above it, while taking a live
   * listing off the site removes a public page other people may already be
   * linking to — the one direction worth a moment's pause.
   */
  const handleSetStatus = (next: "DRAFT" | "APPROVED") => {
    setError(null);
    startTransition(async () => {
      const res = await setListingStatusAction(listingId, next);
      if (!res.ok) {
        setError(res.error);
        setDraftConfirmOpen(false);
        return;
      }
      setDraftConfirmOpen(false);
      setOpen(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteListing(listingId);
      if (result?.error) {
        setError(result.error);
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  };

  const itemCls =
    "block w-full px-3 py-2 text-left font-body text-[13px] text-ink transition-colors hover:bg-stone/30";

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${listingTitle}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-stone/30 hover:text-ink"
      >
        <MoreHorizontal strokeWidth={1.5} className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-[168px] overflow-hidden rounded-lg border border-hairline bg-cream py-1 shadow-sm"
        >
          {/* A draft has no public page; linking to one would 404. */}
          {!isDraft && (
            <Link href={publicHref} role="menuitem" className={itemCls} onClick={() => setOpen(false)}>
              View
            </Link>
          )}
          <Link
            href={`/me/listings/${listingId}/edit`}
            role="menuitem"
            className={itemCls}
            onClick={() => setOpen(false)}
          >
            Edit
          </Link>
          {!isDraft && (
            <Link
              href={`/me/tools?listing=${encodeURIComponent(listingId)}`}
              role="menuitem"
              className={itemCls}
              onClick={() => setOpen(false)}
            >
              Promote
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            disabled={isPending}
            className={`${itemCls} text-red-600 hover:bg-red-50 disabled:opacity-50`}
          >
            Delete
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="absolute right-0 top-9 z-20 w-[200px] rounded-lg border border-hairline bg-cream p-2 font-body text-[12px] text-red-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={draftConfirmOpen}
        title={`Move “${listingTitle}” to draft?`}
        body="It comes off the public site — its page, the directories and search. Nothing is deleted: images, links and the same web address all come back when you publish it again."
        confirmLabel={isPending ? "Moving…" : "Move to draft"}
        cancelLabel="Keep it published"
        pending={isPending}
        onConfirm={() => handleSetStatus("DRAFT")}
        onCancel={() => setDraftConfirmOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete “${listingTitle}”?`}
        body="This removes the listing and its images for everyone. It cannot be undone."
        confirmLabel={isPending ? "Deleting…" : "Delete"}
        cancelLabel="Keep it"
        pending={isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

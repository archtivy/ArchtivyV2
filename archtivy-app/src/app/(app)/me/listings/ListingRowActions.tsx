"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteListing } from "@/app/actions/listings";
import { getListingUrl } from "@/lib/canonical";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";

interface ListingRowActionsProps {
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
  /** DRAFT rows have no public page to view. */
  isDraft?: boolean;
}

/**
 * Row actions for a listing the signed-in user owns.
 *
 * ── EDIT IS REAL NOW ────────────────────────────────────────────────────────
 * "View" and "Edit" once both pointed at getListingUrl(...) — the same public
 * detail page — so the button was removed rather than left doing the wrong
 * thing. It is back, pointing at /me/listings/[id]/edit, which renders the
 * publish wizard prefilled and posts to an owner-guarded update action.
 *
 * Drafts get Edit too, and it is the ONLY action they get besides Delete:
 * a draft has no public page, so finishing it is the whole point of the row.
 *
 * ── DELETE IS A REAL CONFIRMATION ───────────────────────────────────────────
 * Previously window.confirm() plus alert() on failure. Both are unstyled OS
 * dialogs, and confirm() puts the destructive default one Enter away. The
 * shared ConfirmDialog focuses Cancel on open and closes on Escape, and errors
 * now render inline instead of in an alert() the user has to dismiss blind.
 *
 * The delete itself re-checks ownership server-side via canManageListing —
 * both owner columns, not just owner_clerk_user_id.
 */
export function ListingRowActions({
  listingId,
  listingType,
  listingTitle,
  isDraft = false,
}: ListingRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicHref = getListingUrl({ id: listingId, type: listingType });

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

  const linkCls =
    "rounded px-2 py-1 font-body text-[13px] text-muted transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-ink/20";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {/* A draft has no public page — linking to one would 404. */}
        {!isDraft && (
          <Link href={publicHref} className={linkCls}>
            View
          </Link>
        )}
        <Link href={`/me/listings/${listingId}/edit`} className={linkCls}>
          Edit
        </Link>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={isPending}
          className="rounded px-2 py-1 font-body text-[13px] text-muted transition-colors hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {error && (
        <p role="alert" className="font-body text-[12px] text-red-600">
          {error}
        </p>
      )}

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

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
 * ── EDIT WAS A LIE, AND IS NOW ABSENT RATHER THAN FAKE ──────────────────────
 * "View" and "Edit" both pointed at getListingUrl(...) — the same public detail
 * page. Two buttons, one behaviour, and no way to change a listing after
 * publishing it.
 *
 * The button is REMOVED here rather than repointed. A real edit path needs an
 * owner-guarded update action plus an edit mode in both wizards (createProject
 * alone is 450 lines of related-table writes and rollback), and that has not
 * been built yet. Linking to a route that does not exist would trade a button
 * that does the wrong thing for one that 404s. Absent is the honest state
 * until the edit path lands.
 *
 * ── DELETE IS A REAL CONFIRMATION ───────────────────────────────────────────
 * Previously window.confirm() plus alert() on failure. Both are unstyled OS
 * dialogs, and confirm() puts the destructive default one Enter away. The
 * shared ConfirmDialog focuses Cancel on open and closes on Escape, and errors
 * now render inline instead of in an alert() the user has to dismiss blind.
 *
 * The delete itself is unchanged and already correct: the server action
 * re-checks owner_clerk_user_id and refuses anything the caller does not own.
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

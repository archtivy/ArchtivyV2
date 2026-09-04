"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { setListingStatusAction } from "@/app/actions/listingStatus";

/**
 * The draft/published control on the owner's edit page.
 *
 * ── WHY IT SITS HERE AND NOT IN THE WIZARD ──────────────────────────────────
 * The edit route renders the same wizard /add/project and /add/product render,
 * prefilled — which is exactly why the control cannot live inside it. On the
 * add route there is no listing yet, so there is nothing to publish or
 * un-publish, and a status control would be a button with no subject. This is
 * the edit page's own header instead: the wizard below is untouched, and both
 * routes keep rendering the same component.
 *
 * ── IT OWNS NO RULES ────────────────────────────────────────────────────────
 * Every decision belongs to `setListingStatusAction`: who may change a
 * listing, which column moves, the products sidecar, the cache tags and paths
 * to invalidate, and whether the hero is pre-warmed. This file sends an id and
 * a target status and draws the result. There is no second action, no second
 * status field, and no authorisation logic here — the server re-checks
 * ownership on every call regardless of what this component chose to render.
 *
 * "Published" is the word shown; APPROVED is the value stored.
 */
export function ListingStatusBar({
  listingId,
  status,
  title,
}: {
  listingId: string;
  /** The raw `listings.status` value — APPROVED, DRAFT or PENDING. */
  status: string;
  title: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDraft = status === "DRAFT";

  /*
   * Publishing applies straight away; un-publishing asks first. Making
   * something live is additive and reversible by the same control, while
   * taking a live listing off the site removes a page other people may already
   * be linking to.
   */
  const apply = (next: "DRAFT" | "APPROVED") => {
    setError(null);
    startTransition(async () => {
      const res = await setListingStatusAction(listingId, next);
      if (!res.ok) {
        setError(res.error);
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  };

  return (
    /*
     * No width, no padding, no header offset of its own.
     *
     * This used to carry the wizard's column classes plus `pt-[104px]` and a
     * matching negative bottom margin, because it rendered ABOVE the wizard
     * and therefore outside its cream, header-offset container — which put a
     * white band under the global header and made the bar responsible for
     * cancelling padding it did not own. It is passed to the wizard's
     * `headerSlot` now, so it sits inside that column and simply inherits it.
     */
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className={[
              "rounded px-2 py-0.5 font-body text-[11px]",
              isDraft ? "bg-stone/50 text-muted" : "bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {isDraft ? "Draft" : "Published"}
          </span>
          <span className="font-body text-[13px] text-muted">
            {isDraft
              ? "Only you can see this listing."
              : "This listing is live on Archtivy."}
          </span>
        </div>

        {isDraft ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => apply("APPROVED")}
            className="rounded-full bg-ink px-4 py-2 font-body text-[13px] text-cream transition-colors hover:bg-ink/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? "Publishing…" : "Publish"}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => setConfirmOpen(true)}
            className="rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50 disabled:pointer-events-none disabled:opacity-50"
          >
            Move to draft
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 font-body text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Move “${title}” to draft?`}
        body="It comes off the public site — its page, the directories and search. Nothing is deleted: images, links and the same web address all return when you publish it again."
        confirmLabel={isPending ? "Moving…" : "Move to draft"}
        cancelLabel="Keep it published"
        pending={isPending}
        onConfirm={() => apply("DRAFT")}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

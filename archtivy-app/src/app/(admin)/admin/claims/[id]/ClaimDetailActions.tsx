"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { approveClaim, rejectClaim } from "@/app/(admin)/admin/_actions/claims";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, TYPE } from "@/components/admin/ui/tokens";

/**
 * Approve / reject, mounted by the review page.
 *
 * This component was already written and ORPHANED — nothing imported it, so
 * the review page had no decision controls at all. Only two things changed
 * while wiring it up: the palette (raw zinc + emerald-600 → the admin tokens
 * the rest of the area uses), and the reject note moved onto its own line
 * because it is a sentence, not a chip.
 *
 * The approve/reject SEMANTICS are untouched: same two server actions, same
 * optional admin note on reject, same "no further actions" once decided.
 * Authorization is enforced in those actions, server-side; this only decides
 * what to draw.
 */
export function ClaimDetailActions({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") {
    return (
      <p className="font-body text-[14px] text-muted">
        This claim has been {status}. No further actions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="font-body text-[14px] text-red-600" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="claim-reject-note" className={TYPE.columnHeader}>
          Reason for rejection <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="claim-reject-note"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="Recorded on the claim, for your own reference."
          disabled={isPending}
          className={`mt-1.5 ${INPUT}`}
        />
      </div>

      {/* Reject on the left, approve on the right: the irreversible action —
          approve reassigns the profile — is the one that sits under the
          cursor's resting position last. */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await rejectClaim(requestId, rejectNote || null);
              if (!res.ok) setError(res.error ?? "Failed to reject this claim.");
              else router.refresh();
            });
          }}
          className={BTN_SECONDARY}
        >
          {isPending ? "Working…" : "Reject"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await approveClaim(requestId);
              if (!res.ok) setError(res.error ?? "Failed to approve this claim.");
            });
          }}
          className={BTN_PRIMARY}
        >
          {isPending ? "Working…" : "Approve claim"}
        </button>
      </div>
    </div>
  );
}

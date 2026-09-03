"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveLeadAction, rejectLeadAction } from "../actions";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/components/admin/ui/tokens";

/**
 * Approve / reject on a lead.
 *
 * The label tells the truth about what approval will do, which now depends on
 * the recipient: "Approve & Send" when a real account will receive a message,
 * "Approve & email owner" when the owner profile has no reachable account and
 * only the existing email path will run. Guessing one label for both would
 * promise in-app delivery for the 72 of 80 products that cannot receive it.
 *
 * Authorization is server-side in both actions. Disabling this button while a
 * request is in flight is a courtesy against double-clicks, not the duplicate
 * protection — that is the compare-and-swap in deliverLeadToInbox.
 */
export function LeadDetailActions({
  leadId,
  deliverable,
}: {
  leadId: string;
  /** A real in-app recipient resolved for this lead's listing. */
  deliverable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ error: string } | { ok: true }>, to: string) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push(to);
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-body text-[14px] text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => run(() => rejectLeadAction(leadId), "/admin/leads?status=rejected")}
          disabled={isPending}
          className={BTN_SECONDARY}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => run(() => approveLeadAction(leadId), "/admin/leads?status=approved")}
          disabled={isPending}
          className={BTN_PRIMARY}
        >
          {isPending ? "Working…" : deliverable ? "Approve & Send" : "Approve & email owner"}
        </button>
      </div>
    </div>
  );
}

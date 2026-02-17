"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveLeadAction, rejectLeadAction } from "../actions";


export function LeadDetailActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    startTransition(async () => {
      const result = await approveLeadAction(leadId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push("/admin/leads?status=approved");
    });
  };

  const handleReject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectLeadAction(leadId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push("/admin/leads?status=rejected");
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isPending ? "Processing…" : "Approve & send to owner"}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50"
      >
        Reject
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}


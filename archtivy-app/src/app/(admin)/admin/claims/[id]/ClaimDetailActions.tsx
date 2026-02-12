"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { approveClaim, rejectClaim } from "@/app/(admin)/admin/_actions/claims";

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
      <div className="text-sm text-zinc-600">
        This claim has been {status}. No further actions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-zinc-900">Actions</div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await approveClaim(requestId);
              if (!res.ok) setError(res.error ?? "Failed");
            });
          }}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "…" : "Approve"}
        </button>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Admin note (optional)"
            className="h-9 w-56 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                setError(null);
                const res = await rejectClaim(requestId, rejectNote || null);
                if (!res.ok) setError(res.error ?? "Failed");
                else router.refresh();
              });
            }}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

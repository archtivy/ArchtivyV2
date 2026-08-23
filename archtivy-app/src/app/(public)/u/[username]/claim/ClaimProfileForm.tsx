"use client";

import { useTransition, useState } from "react";
import { submitClaimRequest } from "@/app/actions/claimProfile";

type SubmitResult = { ok: boolean; error?: string };

export function ClaimProfileForm({ profileId }: { profileId: string }) {
  const [state, setState] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const id = (formData.get("profile_id") as string) ?? profileId;
      const res = await submitClaimRequest(id, formData);
      setState(res);
    });
  }

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-800">
          Claim request submitted. We&apos;ll review it shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }}
      className="space-y-4 rounded-xl border border-hairline bg-cream p-4"
    >
      <input type="hidden" name="profile_id" value={profileId} />
      <div>
        <label htmlFor="requester_name" className="text-sm font-medium text-ink">
          Your name *
        </label>
        <input
          id="requester_name"
          name="requester_name"
          required
          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-ink"
        />
      </div>
      <div>
        <label htmlFor="requester_email" className="text-sm font-medium text-ink">
          Your email *
        </label>
        <input
          id="requester_email"
          name="requester_email"
          type="email"
          required
          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-ink"
        />
      </div>
      <div>
        <label htmlFor="requester_website" className="text-sm font-medium text-ink">
          Your website (optional)
        </label>
        <input
          id="requester_website"
          name="requester_website"
          type="url"
          placeholder="https://"
          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-cream px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-ink"
        />
      </div>
      <div>
        <label htmlFor="proof_note" className="text-sm font-medium text-ink">
          Proof / note (optional)
        </label>
        <textarea
          id="proof_note"
          name="proof_note"
          rows={4}
          placeholder="Why you should own this profile..."
          className="mt-1 w-full rounded-lg border border-hairline bg-cream px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ink"
        />
      </div>
      {state && !state.ok && state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Submit claim request"}
      </button>
    </form>
  );
}

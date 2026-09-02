"use client";

import { useTransition, useState } from "react";
import { submitClaimRequest } from "@/app/actions/claimProfile";

type SubmitResult = { ok: boolean; error?: string };

export function ClaimProfileForm({ profileId }: { profileId: string }) {
  const [state, setState] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      /*
       * The profile id comes from the PROP, not from the form.
       *
       * This read `formData.get("profile_id")` and preferred it over the prop,
       * so which profile got claimed was decided by a hidden input any visitor
       * could edit. The action re-checks that the target exists and is
       * unclaimed, so the blast radius was small — but it let a claim be filed
       * against a profile other than the one on screen, which is the shape of
       * bug §9 is about. The hidden input is gone with it.
       */
      const res = await submitClaimRequest(profileId, formData);
      setState(res);
    });
  }

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
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
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <label htmlFor="requester_name" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Your name *
        </label>
        <input
          id="requester_name"
          name="requester_name"
          required
          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-archtivy-primary dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="requester_email" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Your email *
        </label>
        <input
          id="requester_email"
          name="requester_email"
          type="email"
          required
          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-archtivy-primary dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="requester_website" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Your website (optional)
        </label>
        <input
          id="requester_website"
          name="requester_website"
          type="url"
          placeholder="https://"
          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-archtivy-primary dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
      <div>
        <label htmlFor="proof_note" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Proof / note (optional)
        </label>
        <textarea
          id="proof_note"
          name="proof_note"
          rows={4}
          placeholder="Why you should own this profile..."
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-archtivy-primary dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>
      {state && !state.ok && state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isPending ? "Submitting…" : "Submit claim request"}
      </button>
    </form>
  );
}

"use client";

import { useTransition, useState } from "react";
import { claimProfileById } from "./actions";

type SubmitResult = { ok: boolean; error?: string };

export function ClaimProfileByIdForm({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [state, setState] = useState<SubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await claimProfileById(profileId, formData);
      if (res.ok) {
        setState({ ok: true });
        return;
      }
      setState({ ok: false, error: res.error });
    });
  }

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Request submitted. An admin will review it shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="profile_id" value={profileId} />
      <div>
        <label htmlFor="username" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Username *
        </label>
        <input
          id="username"
          name="username"
          required
          minLength={3}
          maxLength={32}
          placeholder="e.g. jane-doe"
          className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-archtivy-primary dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          3–32 characters, letters, numbers, and hyphens only. Your profile URL will be /u/username
        </p>
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Display name
        </label>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {displayName || "—"}
        </p>
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Message (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={3}
          placeholder="Any message for our team..."
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
        {isPending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}

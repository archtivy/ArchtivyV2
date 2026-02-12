"use client";

import { useUser, useClerk } from "@clerk/nextjs";

export function SettingsAccount() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Email</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Password</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Change your password and account security in your account settings.
        </p>
        <button
          type="button"
          onClick={() => openUserProfile?.()}
          className="mt-2 rounded-[20px] border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
        >
          Open account settings
        </button>
      </div>
    </div>
  );
}

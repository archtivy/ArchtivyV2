"use client";

import { useUser, useClerk } from "@clerk/nextjs";

export function SettingsAccount() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const email = user?.primaryEmailAddress?.emailAddress ?? "—";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-ink">Email</h3>
        <p className="mt-1 text-sm text-muted">{email}</p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-ink">Password</h3>
        <p className="mt-1 text-sm text-muted">
          Change your password and account security in your account settings.
        </p>
        <button
          type="button"
          onClick={() => openUserProfile?.()}
          className="mt-2 rounded-[20px] border border-hairline px-4 py-2 text-sm font-medium text-ink transition hover:bg-stone/60 focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
        >
          Open account settings
        </button>
      </div>
    </div>
  );
}

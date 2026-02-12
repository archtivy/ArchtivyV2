"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Completing sign in…
        </p>
        <AuthenticateWithRedirectCallback
          afterSignInUrl="/"
          afterSignUpUrl="/onboarding"
        />
      </div>
    </div>
  );
}

"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

function isClerkConfiguredClient(): boolean {
  const pk =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string)
      : process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return false;
  if (pk === "pk_test_xxxx" || pk === "pk_live_xxxx") return false;
  return true;
}

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  if (!isClerkConfiguredClient()) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      {children}
    </ClerkProvider>
  );
}

"use client";

import { SignUp } from "@clerk/nextjs";

export function SignUpPageClient() {
  return (
    <div className="flex justify-center py-8">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-none border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
          },
          variables: {
            colorPrimary: "#2563eb",
            borderRadius: "0.375rem",
          },
        }}
        signInUrl="/sign-in"
        afterSignUpUrl="/welcome"
      />
    </div>
  );
}

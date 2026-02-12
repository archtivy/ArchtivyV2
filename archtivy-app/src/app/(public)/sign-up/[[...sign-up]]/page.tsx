"use client";

import * as React from "react";
import Link from "next/link";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { OAuthStrategy } from "@clerk/types";
import { AuthSplitLayout, authInputClass, authLabelClass } from "@/components/auth/AuthSplitLayout";

function isClerkError(err: unknown): err is { errors: { message?: string }[] } {
  return typeof err === "object" && err !== null && Array.isArray((err as { errors?: unknown }).errors);
}
import { Button } from "@/components/ui/Button";

const SSO_CALLBACK_URL = "/sign-in/sso-callback";
const AFTER_SIGN_UP_URL = "/onboarding";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const signUpWithOAuth = (strategy: OAuthStrategy) => {
    if (!signUp || !isLoaded) return;
    setError("");
    signUp
      .authenticateWithRedirect({
        strategy,
        redirectUrl: SSO_CALLBACK_URL,
        redirectUrlComplete: AFTER_SIGN_UP_URL,
      })
      .catch((err) => {
        setError(err?.errors?.[0]?.message ?? "Something went wrong.");
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (confirmPassword !== password) {
      setError("Passwords do not match.");
      return;
    }
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      await signUp.create({ emailAddress, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err) {
      if (isClerkError(err)) {
        setError(err.errors?.[0]?.message ?? "Something went wrong.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isLoaded || !signUp) return;
    setLoading(true);
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({ code });
      if (signUpAttempt.status === "complete") {
        await setActive({
          session: signUpAttempt.createdSessionId,
          navigate: async () => {
            router.push(AFTER_SIGN_UP_URL);
          },
        });
      } else {
        setError("Verification could not be completed.");
      }
    } catch (err) {
      if (isClerkError(err)) {
        setError(err.errors?.[0]?.message ?? "Invalid code.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <AuthSplitLayout title="Sign up">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      </AuthSplitLayout>
    );
  }

  if (verifying) {
    return (
      <AuthSplitLayout
        title="Verify your email"
        subtitle="We sent a verification code to your email."
      >
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="code" className={authLabelClass}>
              Verification code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={authInputClass}
              placeholder="000000"
              autoComplete="one-time-code"
            />
          </div>
          {error && (
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{error}</p>
          )}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </Button>
        </form>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout title="Sign up" subtitle="Create an account to get started.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            className={authInputClass}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className={authLabelClass}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        {error && (
          <p className="text-sm text-zinc-900 dark:text-zinc-100">{error}</p>
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Creating account…" : "Sign up"}
        </Button>
        <div className="relative my-6">
          <span className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
          </span>
          <span className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Or continue with
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => signUpWithOAuth("oauth_google")}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => signUpWithOAuth("oauth_linkedin_oidc")}
            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-zinc-200 dark:border-zinc-700 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </button>
        </div>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-archtivy-primary hover:opacity-90 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { OnboardingSteps } from "./OnboardingSteps";

const DISMISS_KEY = "archtivy-onboarding-dismissed";

export function OnboardingPanel() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    } catch {
      setDismissed(true);
    }
  };

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
        aria-label="Dismiss"
      >
        <span className="text-lg leading-none">×</span>
      </button>
      <div className="pr-8 pb-4 pt-4 pl-4">
        <OnboardingSteps />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface Props {
  initialEnabled: boolean;
}

export function FeatureListingToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !enabled;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_listing_enabled: next }),
      });
      if (res.ok) setEnabled(next);
    } catch {
      // revert on failure
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-zinc-900">Feature Listing</p>
        <p className="text-xs text-zinc-500">
          {enabled
            ? "Users can see and use the Feature Listing page."
            : "Hidden from users. The page and API are disabled."}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50 ${
          enabled ? "bg-[#002abf]" : "bg-zinc-200"
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle Feature Listing"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

"use client";

import * as React from "react";
import { generateClaimLink } from "@/app/(admin)/admin/_actions/profiles";

export function CopyClaimLinkButton({ profileId }: { profileId: string }) {
  const [status, setStatus] = React.useState<"idle" | "loading" | "copied" | "error">("idle");
  const [message, setMessage] = React.useState("");

  const handleClick = async () => {
    setStatus("loading");
    setMessage("");
    const result = await generateClaimLink(profileId);
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    try {
      await navigator.clipboard.writeText(result.url);
      setStatus("copied");
    } catch {
      setStatus("error");
      setMessage("Could not copy to clipboard.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50"
      >
        {status === "loading" ? "Generating…" : status === "copied" ? "Copied!" : "Copy claim link"}
      </button>
      {message ? <span className="text-sm text-red-600">{message}</span> : null}
    </div>
  );
}

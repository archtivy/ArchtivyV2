"use client";

import { useState } from "react";
import { rebuildMatchesAction } from "../_actions/matches";

export function RebuildMatchesButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleClick() {
    setStatus("running");
    setMessage("");
    const result = await rebuildMatchesAction();
    if (result.ok) {
      setStatus("done");
      setMessage(
        `Success. DB updated: ${result.matchesUpserted} matches upserted, ${result.matchesDeletedStale} stale deleted. (Projects: ${result.projectsCount}, Products: ${result.productsCount}, run ${result.runId.slice(0, 8)})${result.errors.length ? `. ${result.errors.length} non-fatal errors.` : ""}`
      );
    } else {
      setStatus("error");
      setMessage(result.error);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Rebuild Matches Now</div>
      <div className="mt-1 text-xs text-zinc-500">
        Recompute matches from image_ai (listing_images). Avg embedding per listing, cosine all projects vs products. Cleans stale matches.
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "running"}
          className="rounded-lg bg-archtivy-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-archtivy-primary/90 disabled:opacity-50"
        >
          {status === "running" ? "Running…" : "Rebuild Matches Now"}
        </button>
      </div>
      {message && (
        <div
          role="alert"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200"}`}
        >
          {message}
        </div>
      )}
    </div>
  );
}

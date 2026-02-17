"use client";

import { useState } from "react";
import { rebuildMatchesAction } from "../_actions/matches";

interface BackfillResponse {
  processed?: number;
  updatedAlt?: number;
  upsertedImageAi?: number;
  skippedListings?: string[];
  errors?: string[];
  message?: string;
}

export function ImageAiBackfillAndRebuildButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleClick() {
    setStatus("running");
    setMessage("");

    try {
      // 1) Run image AI backfill (alt + image_ai for all listing_images with null/empty alt)
      const backfillRes = await fetch("/api/admin/image-ai-backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!backfillRes.ok) {
        const errBody = await backfillRes.text();
        setStatus("error");
        setMessage(`Backfill failed (${backfillRes.status}): ${errBody.slice(0, 300)}`);
        return;
      }

      const backfill = (await backfillRes.json()) as BackfillResponse;
      const processed = backfill.processed ?? 0;
      const updatedAlt = backfill.updatedAlt ?? 0;
      const upsertedImageAi = backfill.upsertedImageAi ?? 0;
      const skippedListings = backfill.skippedListings ?? [];
      const backfillErrors = backfill.errors ?? [];

      // 2) Rebuild matches from image_ai
      const rebuildResult = await rebuildMatchesAction();

      if (!rebuildResult.ok) {
        setStatus("error");
        setMessage(
          `Backfill done (processed: ${processed}, alt: ${updatedAlt}, image_ai: ${upsertedImageAi}). Rebuild failed: ${rebuildResult.error}`
        );
        return;
      }

      setStatus("done");
      const summary = [
        `Backfill: ${processed} processed, ${updatedAlt} alts updated, ${upsertedImageAi} image_ai upserted.`,
        `Matches: ${rebuildResult.matchesUpserted} upserted, ${rebuildResult.matchesDeletedStale} stale deleted.`,
      ];
      if (skippedListings.length > 0) {
        summary.push(`${skippedListings.length} listing(s) skipped (over image limit).`);
      }
      if (backfillErrors.length > 0) {
        summary.push(`${backfillErrors.length} backfill error(s).`);
      }
      if (rebuildResult.errors.length > 0) {
        summary.push(`${rebuildResult.errors.length} rebuild error(s).`);
      }
      setMessage(summary.join(" "));
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">
        Run Image AI Backfill + Rebuild Matches
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        Backfill alt text and image_ai for all listing_images (null/empty alt), then rebuild matches
        from embeddings. One click; no manual SQL.
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={status === "running"}
          className="rounded-lg bg-archtivy-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-archtivy-primary/90 disabled:opacity-50"
        >
          {status === "running" ? "Running…" : "Run Image AI Backfill + Rebuild Matches"}
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

"use client";

import { useState } from "react";

/**
 * Runs the visual-discovery precompute: signature + embedding per image, and
 * clickable object regions with their product candidates for project photos.
 *
 * ── DRY RUN FIRST, ON PURPOSE ───────────────────────────────────────────────
 * This is the only control in the admin area that spends money per click, so
 * the primary button does not spend any: it reports what a real run would
 * touch. The run button appears only after a dry run has said how many images
 * that is, and it processes a bounded batch rather than the whole catalogue,
 * so the cost of one press is always knowable in advance.
 *
 * "Missing" covers images with no vector at all — new uploads land here, since
 * nothing recomputes them automatically today. "Everything" re-runs images
 * that already have a vector, which is what replaces the synthetic ones the
 * old embedding fallback wrote.
 */

interface RunResult {
  dryRun?: boolean;
  wouldProcess?: number;
  projects?: number;
  products?: number;
  mode?: string;
  processed?: number;
  embedded?: number;
  regions?: number;
  seconds?: number;
  errors?: string[];
  error?: string;
}

const BATCH = 40;

export function VisualDiscoveryButton() {
  const [mode, setMode] = useState<"missing" | "all">("missing");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function call(params: string): Promise<RunResult | null> {
    setBusy(true);
    setIsError(false);
    try {
      const res = await fetch(`/api/cron/visual-discovery?${params}`, {
        method: "POST",
        cache: "no-store",
      });
      const body = (await res.json()) as RunResult;
      if (!res.ok) {
        setIsError(true);
        setMessage(body.error ?? `Failed (${res.status})`);
        return null;
      }
      return body;
    } catch (e) {
      setIsError(true);
      setMessage(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function dryRun() {
    const r = await call(`mode=${mode}&limit=250&dryRun=1`);
    if (!r) return;
    setPending(r.wouldProcess ?? 0);
    setMessage(
      `${r.wouldProcess ?? 0} image(s) to process — ${r.projects ?? 0} project, ${r.products ?? 0} product. Nothing was sent to a model.`
    );
  }

  async function run() {
    const r = await call(`mode=${mode}&limit=${BATCH}`);
    if (!r) return;
    setPending(null);
    setMessage(
      `Processed ${r.processed ?? 0} in ${r.seconds ?? 0}s — ${r.embedded ?? 0} embedded, ${r.regions ?? 0} regions written.` +
        (r.errors?.length ? ` ${r.errors.length} error(s): ${r.errors[0]}` : "")
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Visual discovery precompute</div>
      <div className="mt-1 text-xs text-zinc-500">
        Describes each photograph, embeds it, and locates the clickable objects in project
        images. This is what fills the lightbox product feed. Costs money per image — check
        first, then run in batches of {BATCH}.
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as "missing" | "all");
            setPending(null);
            setMessage("");
          }}
          disabled={busy}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900"
          aria-label="Which images to process"
        >
          <option value="missing">Images with no vector yet</option>
          <option value="all">Everything (replaces existing vectors)</option>
        </select>

        <button
          type="button"
          onClick={dryRun}
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
        >
          {busy ? "Working…" : "Check first"}
        </button>

        {pending !== null && pending > 0 && (
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="rounded-lg bg-archtivy-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-archtivy-primary/90 disabled:opacity-50"
          >
            Process next {Math.min(BATCH, pending)}
          </button>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
            isError ? "bg-red-50 text-red-800" : "bg-zinc-50 text-zinc-700"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}

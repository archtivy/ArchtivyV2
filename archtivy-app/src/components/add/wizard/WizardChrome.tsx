"use client";

import { Check } from "lucide-react";

/**
 * Wizard chrome — the step rail, progress and autosave indicator.
 *
 * Visual bar: this is an authoring surface people spend twenty minutes in, not
 * an admin table. Soft cards, hairline borders, generous spacing, one focal
 * action per screen. It deliberately does not reuse /add/project's old dense
 * styling — only its data handling was worth keeping.
 */

export interface WizardStepMeta {
  id: string;
  label: string;
  /** Complete enough to show a checkmark. Never blocks navigation. */
  complete: boolean;
}

export function StepRail({
  steps,
  current,
  onGo,
}: {
  steps: WizardStepMeta[];
  current: number;
  onGo: (index: number) => void;
}) {
  return (
    <nav aria-label="Publish steps">
      <ol className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-0.5 lg:overflow-visible">
        {steps.map((s, i) => {
          const active = i === current;
          const done = s.complete && !active;
          return (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onGo(i)}
                aria-current={active ? "step" : undefined}
                className={[
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                  active ? "bg-ink text-cream" : "text-muted hover:bg-stone/50 hover:text-ink",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] tabular-nums transition-all duration-200",
                    active
                      ? "bg-cream text-ink"
                      : done
                        ? "bg-ink text-cream"
                        : "border border-current text-current",
                  ].join(" ")}
                >
                  {done ? <Check strokeWidth={2.5} className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap font-body text-[14px]">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Animated completion bar. Width transitions; it never jumps. */
export function WizardProgress({ steps }: { steps: WizardStepMeta[] }) {
  const done = steps.filter((s) => s.complete).length;
  const percent = Math.round((done / steps.length) * 100);
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-body text-[12px] uppercase tracking-[0.12em] text-muted">
          Progress
        </span>
        <span className="font-body text-[12px] tabular-nums text-ink">
          {done} of {steps.length}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-stone"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Publishing progress"
      >
        <div
          className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Autosave indicator. Quiet by design — it fades in on save and fades out
 * again, and never blocks. A spinner over a form the user is still typing in
 * implies their work is at risk, which it is not.
 */
export function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  return (
    <span
      aria-live="polite"
      className={[
        "font-body text-[12px] transition-opacity duration-500 motion-reduce:transition-none",
        state === "idle" ? "opacity-0" : "opacity-100",
        state === "saved" ? "text-muted" : "text-muted/70",
      ].join(" ")}
    >
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : ""}
    </span>
  );
}

/**
 * Live preview in a browser chrome rather than a bare card, so the author reads
 * it as "this is the page" instead of "this is a widget".
 */
export function DeviceFrame({
  url,
  children,
}: {
  url: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-hairline bg-cream shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2 border-b border-hairline bg-stone/40 px-3 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
        </span>
        <span className="ml-1 min-w-0 flex-1 truncate rounded-md bg-cream px-2.5 py-1 font-body text-[11px] text-muted">
          {url}
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

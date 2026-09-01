"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useProfileEdit, type ProfileDraft } from "./ProfileEditContext";

/**
 * A published value that becomes an input in place.
 *
 * ── THE PUBLIC RENDER IS THE DEFAULT PATH ───────────────────────────────────
 * Outside edit mode this returns `children` and NOTHING else — no wrapper, no
 * hidden button, no data attribute. That is what keeps the public page byte-for
 * byte what it was, and what keeps edit markup off a non-owner's HTML entirely:
 * for them the provider is not mounted, useProfileEdit() is null, and this
 * component is a pass-through.
 *
 * ── EDITING HAPPENS WHERE THE TEXT IS ───────────────────────────────────────
 * The input inherits the published typography via `inputClassName` rather than
 * imposing form styling, so the name still looks like the name while you type
 * it. The pencil sits beside the value; clicking either opens the editor.
 */
export function EditableText({
  field,
  children,
  multiline = false,
  placeholder,
  /** Classes that reproduce the published typography inside the input. */
  inputClassName,
  /** Where the pencil sits relative to the value. */
  align = "start",
  maxLength,
  rows = 5,
  displayClassName = "",
  seed,
}: {
  field: keyof ProfileDraft;
  children: React.ReactNode;
  multiline?: boolean;
  placeholder?: string;
  inputClassName: string;
  align?: "start" | "center";
  maxLength?: number;
  rows?: number;
  /**
   * Extra classes for the edit-mode display only — the clamp, typically.
   * NOT applied to the open input, where you must be able to see what you are
   * editing, and not to the public render, which owns its own markup.
   */
  displayClassName?: string;
  /**
   * DISPLAY-ONLY fallback shown when this field is empty. Never copied into the
   * draft: the intro falls back to `bio` for display, but typing must start
   * from an empty short_bio so About is not silently duplicated into it. The
   * open input shows the placeholder, not this.
   */
  seed?: string;
}) {
  const ctx = useProfileEdit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Leaving edit mode closes any field left open, so Cancel restores the
  // rendered typography everywhere at once.
  useEffect(() => {
    if (!ctx?.editing) setOpen(false);
  }, [ctx?.editing]);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!ctx || !ctx.editing) return <>{children}</>;

  const value = ctx.draft[field];

  if (open) {
    const shared = {
      ref: ref as never,
      value,
      maxLength,
      placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        ctx.setField(field, e.target.value),
      onBlur: () => setOpen(false),
      onKeyDown: (e: React.KeyboardEvent) => {
        // Escape closes the field without touching the draft — Cancel is the
        // control that discards, and it lives with Save.
        if (e.key === "Escape") setOpen(false);
        if (e.key === "Enter" && !multiline) setOpen(false);
      },
      className: `${inputClassName} w-full rounded-md border border-ink/20 bg-white px-2 py-1 focus:border-ink/40 focus:outline-none`,
    };

    return (
      <span className="block">
        {multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} type="text" />}
        {multiline && maxLength != null && (
          <span className="mt-1 block text-right font-body text-[11px] text-muted">
            {value.length} / {maxLength}
          </span>
        )}
      </span>
    );
  }

  /*
   * In edit mode the DRAFT is what is shown, not the saved value.
   *
   * Rendering `children` here would print the server's copy: type a new name,
   * close the field, and the old name comes back until you save — which reads
   * as the edit having been discarded. `inputClassName` reproduces the
   * published typography, so the value looks the same either way.
   */
  return (
    <span
      className={[
        "group/edit inline-flex max-w-full items-start gap-1.5",
        align === "center" ? "justify-center" : "",
      ].join(" ")}
    >
      <span className={`min-w-0 ${inputClassName} ${displayClassName}`}>
        {value || seed || <span className="text-muted">{placeholder ?? "Add…"}</span>}
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${String(field).replace(/_/g, " ")}`}
        className="mt-1 shrink-0 rounded p-0.5 text-muted opacity-60 transition-opacity hover:text-ink group-hover/edit:opacity-100"
      >
        <Pencil strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </button>
    </span>
  );
}

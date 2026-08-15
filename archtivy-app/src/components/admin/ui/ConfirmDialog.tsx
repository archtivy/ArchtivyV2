"use client";

import { useEffect, useRef } from "react";
import { BTN_SECONDARY, TYPE } from "./tokens";

/**
 * Confirmation dialog.
 *
 * Extracted because the listings table and the profiles table each carried
 * their own copy, and they had already drifted — different radii, different
 * button order, and neither closed on Escape or trapped initial focus.
 *
 * Focus moves to Cancel on open, not Confirm: the destructive button should
 * never be one Enter press away from a dialog the user did not expect.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-white p-6 shadow-2xl">
        <h2 id="confirm-dialog-title" className="font-body text-[18px] font-semibold text-ink">
          {title}
        </h2>
        <p className={`mt-2 ${TYPE.pageSubtitle}`}>{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} type="button" onClick={onCancel} className={BTN_SECONDARY}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-red-600 px-4 font-body text-[14px] font-medium text-white transition-colors duration-150 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

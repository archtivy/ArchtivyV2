"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { BTN_PILL_PRIMARY, BTN_PILL_SECONDARY } from "@/components/ui/publicButton";
import { submitProductRequest } from "@/app/actions/productRequest";

/**
 * "Request Information" on a product page.
 *
 * ── ON THE EDITORIAL TOKENS, NOT ContactLeadModal'S ─────────────────────────
 * The dialog this replaces is on the legacy zinc palette with a hardcoded
 * #002abf — a colour that is not a token in this codebase — and has no Escape
 * handling, no focus trap and no focus return. It is left in place because the
 * project contact and quote flows still use it; converting those is separate
 * work. This one is built on cream/ink/hairline like the rest of the current
 * public site, and mirrors the claim dialog's structure so the two read as one
 * system.
 *
 * ── IDENTITY IS NOT IN THIS FORM ────────────────────────────────────────────
 * First and last name are contact metadata and nothing more. The server
 * resolves the requester from the Clerk session and the profile that session
 * owns; nothing typed here can change who the request is from, and the
 * recipient is never sent at all — it is derived from the product's ownership
 * on the server, at approval time.
 */

type Status = "idle" | "submitting" | "success";

export function RequestInformationModal({
  open,
  onClose,
  listingId,
  productTitle,
  brandName,
  coverUrl,
  viewer,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
  productTitle: string;
  brandName: string | null;
  coverUrl: string | null;
  /** The signed-in sender, for the identity line and the name seeds. */
  viewer: { name: string; avatarUrl: string | null; firstName: string; lastName: string };
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(viewer.firstName);
  const [lastName, setLastName] = useState(viewer.lastName);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  /*
   * Minted once per opened dialog and sent with the submission, where the
   * partial unique index on leads.idempotency_key collapses repeats onto one
   * row. Disabling the button covers a slow double-click; it does not cover a
   * request that succeeds while the response is lost.
   */
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (open && !idempotencyKey) setIdempotencyKey(crypto.randomUUID());
  }, [open, idempotencyKey]);

  useEffect(() => {
    setFirstName((v) => (v ? v : viewer.firstName));
  }, [viewer.firstName]);
  useEffect(() => {
    setLastName((v) => (v ? v : viewer.lastName));
  }, [viewer.lastName]);

  const submitting = status === "submitting";

  const requestClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [submitting, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, requestClose]);

  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!firstName.trim()) {
        setError("Please enter your first name.");
        return;
      }
      if (message.trim().length < 15) {
        setError("Please write a little more so the brand can help you.");
        return;
      }
      setStatus("submitting");
      const fd = new FormData();
      fd.set("first_name", firstName.trim());
      fd.set("last_name", lastName.trim());
      fd.set("message", message);
      fd.set("idempotency_key", idempotencyKey);
      const res = await submitProductRequest(listingId, fd);
      if (!res.ok) {
        /* Idle again with every field intact — a rejected submit must never
           cost the sender the message they wrote. */
        setStatus("idle");
        setError(res.error);
        return;
      }
      setStatus("success");
    },
    [firstName, lastName, message, idempotencyKey, listingId]
  );

  if (!open || !mounted) return null;

  const FIELD =
    "mt-1.5 h-11 w-full rounded-lg border border-hairline bg-white px-3.5 font-body text-[14px] text-ink " +
    "placeholder:text-muted/70 outline-none transition-colors focus:border-ink/40 disabled:opacity-60";
  const LABEL = "font-body text-[13px] text-ink";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/25" aria-hidden onClick={requestClose} />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-hairline bg-cream text-left shadow-xl sm:max-w-[540px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pb-4 pt-5">
          <h2
            id={titleId}
            className="font-display text-[20px] leading-tight tracking-tight text-ink"
          >
            Request information
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={submitting}
            aria-label="Close"
            className="-mr-1 shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-stone/40 hover:text-ink disabled:opacity-40"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="px-6 py-10 text-center">
            <p className="font-body text-[15px] text-ink">Request sent.</p>
            <p className="mx-auto mt-2 max-w-[38ch] font-body text-[13px] leading-[20px] text-muted">
              Our team reviews requests before passing them on. You&rsquo;ll hear back from{" "}
              {brandName ?? "the brand"} once it&rsquo;s approved.
            </p>
            <button type="button" onClick={onClose} className={`${BTN_PILL_PRIMARY} mt-6`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {/* Product context: what the request is about, stated once. */}
              <div className="flex items-center gap-3 rounded-lg border border-hairline bg-white p-3">
                {coverUrl ? (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-stone/40">
                    <Image src={coverUrl} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded bg-stone/40" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-body text-[14px] text-ink">
                    {productTitle}
                  </span>
                  {brandName && (
                    <span className="block truncate font-body text-[13px] text-muted">
                      {brandName}
                    </span>
                  )}
                </span>
              </div>

              {/* Sender identity — shown, not asked for. This is the account
                  the request will actually be attributed to. */}
              <div className="mt-4 flex items-center gap-2.5">
                {viewer.avatarUrl ? (
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-stone/40">
                    <Image src={viewer.avatarUrl} alt="" fill sizes="28px" className="object-cover" />
                  </span>
                ) : (
                  <span className="h-7 w-7 shrink-0 rounded-full bg-stone/40" aria-hidden />
                )}
                <p className="min-w-0 truncate font-body text-[13px] text-muted">
                  Sending as <span className="text-ink">{viewer.name}</span>
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50/70 px-3.5 py-2.5 font-body text-[13px] text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="req-first" className={LABEL}>
                    First name
                  </label>
                  <input
                    id="req-first"
                    ref={firstFieldRef}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={submitting}
                    required
                    autoComplete="given-name"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label htmlFor="req-last" className={LABEL}>
                    Last name
                  </label>
                  <input
                    id="req-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={submitting}
                    autoComplete="family-name"
                    className={FIELD}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="req-message" className={LABEL}>
                  Message
                </label>
                <textarea
                  id="req-message"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  required
                  placeholder="I'm interested in this product and would like more information about…"
                  className="mt-1.5 w-full resize-y rounded-lg border border-hairline bg-white px-3.5 py-2.5 font-body text-[14px] leading-[21px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-ink/40 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-hairline px-6 py-4">
              <button
                type="button"
                onClick={requestClose}
                disabled={submitting}
                className={BTN_PILL_SECONDARY}
              >
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={BTN_PILL_PRIMARY}>
                {submitting ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

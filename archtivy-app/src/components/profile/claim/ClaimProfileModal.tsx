"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BTN_PILL_PRIMARY, BTN_PILL_SECONDARY } from "@/components/ui/publicButton";
import { submitClaimRequest } from "@/app/actions/claimProfile";

/**
 * "Claim this profile", in a dialog on the profile itself.
 *
 * ── SAME ACTION, SAME VALIDATION, SAME COLUMNS ──────────────────────────────
 * This posts to submitClaimRequest — the identical server action
 * /u/[username]/claim has always used — with the identical field names, so the
 * server contract is untouched: it still re-checks auth, re-reads the profile,
 * refuses a claimed profile, refuses a second pending claim from the same
 * user, and writes the same row. Nothing about who may claim what moved to the
 * client. The old page remains and still works; this is a second door onto one
 * action, not a second implementation of it.
 *
 * `proof_note` stays the column this path writes. It is where every claim from
 * this entry point has always landed, the admin review reads it, and renaming
 * the field would leave the existing rows meaning something else.
 *
 * ── NAME AND EMAIL ARE PREFILLED, NOT RE-ASKED ──────────────────────────────
 * Both are required by the action, so they are still sent and still shown —
 * but seeded from the signed-in Clerk user, so the common case is a filled
 * form with only the message left to write. They stay editable because the
 * Clerk account's name is often not the name a claimant wants on record, and
 * because Clerk does not always have one.
 */

type Status = "idle" | "submitting" | "success";

export function ClaimProfileModal({
  open,
  onClose,
  profileId,
  profileName,
  profileKind,
  defaultName,
  defaultEmail,
}: {
  open: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  /** e.g. "Designer profile · Milan, Italy" — context only, never submitted. */
  profileKind: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* Seeded once the auth values arrive, and only while the field is still
     untouched — never overwriting something the claimant has typed. */
  useEffect(() => {
    setName((v) => (v ? v : defaultName));
  }, [defaultName]);
  useEffect(() => {
    setEmail((v) => (v ? v : defaultEmail));
  }, [defaultEmail]);

  const submitting = status === "submitting";

  /* A submit in flight has already left the browser; closing here would hide
     the outcome of a request that is still going to land. */
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
      /* Focus trap. Without it Tab walks out of the dialog and onto the page
         behind it, which is still fully rendered underneath. */
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
    /* The page behind must not scroll under the dialog. */
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

      const n = name.trim();
      const m = email.trim();
      if (!n || !m) {
        setError("Please provide your name and email so we can reach you.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)) {
        setError("Please enter a valid email address.");
        return;
      }

      setStatus("submitting");
      /*
       * Built here rather than read off the form element, because the action
       * takes a FormData and the fields are controlled. profileId is passed as
       * the first ARGUMENT and re-validated server-side; the old page also put
       * it in a hidden input, which the action preferred over its own argument
       * — a value from the DOM deciding which profile gets claimed. It is not
       * sent at all now.
       */
      const fd = new FormData();
      fd.set("requester_name", n);
      fd.set("requester_email", m);
      fd.set("requester_website", website.trim());
      fd.set("proof_note", message.trim());

      const res = await submitClaimRequest(profileId, fd);
      if (!res.ok) {
        /* Back to idle with every field intact — a rejected submit must never
           cost the claimant the paragraph they just wrote. */
        setStatus("idle");
        setError(res.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    },
    [name, email, website, message, profileId]
  );

  if (!open || !mounted) return null;

  const FIELD =
    "mt-1.5 h-11 w-full rounded-xl border border-hairline bg-white px-3.5 font-body text-[14px] text-ink " +
    "placeholder:text-muted/70 outline-none transition-colors focus:border-ink/40 disabled:opacity-60";
  const LABEL = "font-body text-[13px] text-ink";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center p-4 sm:items-center sm:p-6">
      {/* Light scrim: enough to seat the dialog, not enough to black out the
          profile behind it, which is the thing being claimed. */}
      <div
        className="absolute inset-0 bg-ink/25"
        aria-hidden
        onClick={requestClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={[
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden bg-cream text-left shadow-xl",
          // 540px sits inside the 500–580 band; the panel is near-full-width
          // below sm, with p-4 on the wrapper keeping it off the screen edges.
          "rounded-2xl border border-hairline sm:max-w-[540px]",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-display text-[20px] leading-tight tracking-tight text-ink"
            >
              Claim this profile
            </h2>
            <p className="mt-1 truncate font-body text-[14px] text-ink">{profileName}</p>
            {profileKind && (
              <p className="mt-0.5 font-body text-[13px] text-muted">{profileKind}</p>
            )}
          </div>
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
            <p className="font-body text-[15px] text-ink">Claim request submitted.</p>
            <p className="mx-auto mt-2 max-w-[36ch] font-body text-[13px] leading-[20px] text-muted">
              Our team will review it and get in touch at {email.trim()}.
            </p>
            <button type="button" onClick={onClose} className={`${BTN_PILL_PRIMARY} mt-6`}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
            {/* Scrolls INSIDE the dialog, so the header and the actions stay
                put on a short viewport. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <p id={descId} className="font-body text-[13px] leading-[20px] text-muted">
                Tell us how you&rsquo;re connected to this profile. Our team will review your
                request.
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 font-body text-[13px] text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="claim-name" className={LABEL}>
                    Your name
                  </label>
                  <input
                    id="claim-name"
                    ref={firstFieldRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                    autoComplete="name"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="claim-email" className={LABEL}>
                    Your email
                  </label>
                  <input
                    id="claim-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                    autoComplete="email"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="claim-website" className={LABEL}>
                    Website <span className="text-muted">(optional)</span>
                  </label>
                  <input
                    id="claim-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={submitting}
                    placeholder="https://"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="claim-message" className={LABEL}>
                    Message to Archtivy <span className="text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="claim-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={submitting}
                    className="mt-1.5 w-full resize-y rounded-xl border border-hairline bg-white px-3.5 py-2.5 font-body text-[14px] leading-[21px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-ink/40 disabled:opacity-60"
                  />
                  <p className="mt-1.5 font-body text-[12px] leading-[18px] text-muted">
                    Briefly explain your connection to this profile or include anything that may
                    help us verify your claim.
                  </p>
                </div>
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
                {submitting ? "Submitting…" : "Submit claim"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

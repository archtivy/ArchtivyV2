"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X } from "lucide-react";
import { BTN_PILL_PRIMARY } from "@/components/ui/publicButton";

/**
 * ── THIS IS A VISUAL PASS ───────────────────────────────────────────────────
 * Every line below the render boundary is new; nothing above it moved. The
 * fields, the validation thresholds, the idempotency key, the endpoint, the
 * payload shape, the moderation flow and the success copy are exactly as they
 * were. What changed is that the dialog was still drawn in the generation of
 * UI this product has otherwise left behind — zinc greys, #002abf, rounded-lg,
 * dark: variants — while the profile it opens from is cream, ink and hairline.
 * It read as a form from another application borrowed for the occasion.
 *
 * It is also the only modal: five surfaces mount it (profile rail, project
 * header, product detail, product lightbox, request-a-quote), so this is a
 * restyle of the canonical component rather than a second one for profiles.
 *
 * ── AND THREE THINGS IT DID NOT DO ──────────────────────────────────────────
 * No focus trap, no Escape key, and the page behind kept scrolling under the
 * open dialog. The brief asked these be preserved where present; none were, so
 * they are added.
 *
 * ── AND ONE REAL BUG ────────────────────────────────────────────────────────
 * From a profile the dialog was rendered INSIDE the left rail, which is
 * `lg:sticky` around a panel with `overflow-hidden`. Sticky positioning opens
 * a stacking context and the overflow clips it, so the dialog — `fixed` and
 * z-50 though it was — had its header cut off by the rail's own bounds while
 * the project cards further down the page painted straight over the top of
 * it. That is the "bottom content can feel cramped or partially hidden"
 * symptom, and no amount of z-index fixes it from in there.
 *
 * It is portalled to document.body instead, which is the only way out of an
 * ancestor's stacking context. Nothing about when it opens or what it submits
 * changes; it is drawn somewhere the page cannot reach it.
 */

export interface ContactLeadModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
  /**
   * 'contact' is the general enquiry this form has always been. 'quote' adds
   * the specification fields a brand needs to price something, and relabels
   * the dialog. Same endpoint, same moderation queue — see the leads
   * quote-request migration for why this is one pipeline and not two.
   */
  kind?: "contact" | "quote";
  /**
   * Who the message is going TO, when the caller knows.
   *
   * Leads are recorded against a LISTING — that is the data model and it is
   * untouched — so from a profile the modal is seeded with that profile's
   * first listing. The header therefore used to announce the listing's title,
   * which on a profile meant someone pressing "Message" on Bonnet Studio was
   * shown the name of one of its products and left to infer the rest.
   *
   * Nothing here is a new data requirement: name, avatar and the role/location
   * line are already rendered by the rail a few pixels away. The four listing
   * call sites pass nothing and keep the header they had.
   */
  recipient?: {
    name: string;
    avatarUrl?: string | null;
    /** Already-composed metadata, e.g. "Artisan / Maker · A Coruña, Spain". */
    meta?: string | null;
  } | null;
}

const MIN_MESSAGE_LENGTH = 15;

export function ContactLeadModal({
  open,
  onClose,
  listingId,
  listingType,
  listingTitle,
  kind = "contact",
  recipient = null,
}: ContactLeadModalProps) {
  const [sender_name, setSenderName] = useState("");
  const [sender_email, setSenderEmail] = useState("");
  const [sender_company, setSenderCompany] = useState("");
  const [message, setMessage] = useState("");
  const [project_name, setProjectName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState("");
  const [desired_timeline, setDesiredTimeline] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /*
   * ── SERVER-SIDE DUPLICATE PREVENTION ──────────────────────────────────────
   * Minted once per opened form and sent with the submission, where a partial
   * unique index collapses repeats onto one row.
   *
   * Disabling the button while submitting (which this form already did) only
   * covers the slow-double-click case. It does not cover a request that
   * succeeds while the response is lost, someone refreshing and resubmitting,
   * or a browser retrying a POST — all of which produce a second identical
   * request the client has no way to recognise. The key travels with the
   * request, so the server can.
   *
   * Reset alongside the fields, so a genuinely new enquiry gets a new key.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const panelRef = useRef<HTMLDivElement>(null);

  /* `document` does not exist during the server render, and this component is
     mounted by server-rendered pages. Portal only once on the client. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const reset = useCallback(() => {
    setSenderName("");
    setSenderEmail("");
    setSenderCompany("");
    setMessage("");
    setProjectName("");
    setQuantity("");
    setLocation("");
    setDesiredTimeline("");
    setStatus("idle");
    setErrorMessage(null);
    setIdempotencyKey(crypto.randomUUID());
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(reset, 200);
  }, [onClose, reset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setStatus("submitting");

      const name = sender_name.trim();
      const email = sender_email.trim();
      const company = sender_company.trim() || null;
      const msg = message.trim();

      if (name.length < 2) {
        setStatus("error");
        setErrorMessage("Please enter your name (at least 2 characters).");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus("error");
        setErrorMessage("Please enter a valid email address.");
        return;
      }
      if (msg.length < MIN_MESSAGE_LENGTH) {
        setStatus("error");
        setErrorMessage(`Message must be at least ${MIN_MESSAGE_LENGTH} characters.`);
        return;
      }

      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listingId,
            sender_name: name,
            sender_email: email,
            sender_company: company,
            message: msg,
            kind,
            idempotency_key: idempotencyKey,
            ...(kind === "quote"
              ? {
                  project_name: project_name.trim() || null,
                  quantity: quantity.trim() || null,
                  location: location.trim() || null,
                  desired_timeline: desired_timeline.trim() || null,
                }
              : {}),
          }),
        });
        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error || "Something went wrong. Please try again.");
          return;
        }
        setStatus("success");
      } catch {
        setStatus("error");
        setErrorMessage("Network error. Please try again.");
      }
    },
    [
      listingId,
      sender_name,
      sender_email,
      sender_company,
      message,
      kind,
      idempotencyKey,
      project_name,
      quantity,
      location,
      desired_timeline,
    ]
  );

  /*
   * ── ESCAPE, SCROLL LOCK, FOCUS ────────────────────────────────────────────
   * None of this existed. The dialog announced aria-modal="true" while the
   * page behind it kept scrolling and the tab key walked straight out of it
   * into the profile underneath, which is the combination that makes a modal
   * unusable with a keyboard and merely annoying with a mouse.
   *
   * Focus lands on the PANEL rather than the first input. Focusing a text
   * field would be the usual choice, but it summons the software keyboard the
   * instant the sheet opens on a phone, eating the viewport the layout below
   * is careful to respect. The panel is focusable, announced, and one Tab away
   * from the first field.
   */
  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow, paddingRight } = document.body.style;
    // Compensate for the scrollbar the lock removes, so the page behind does
    // not jump sideways as the dialog opens.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ),
      ].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previouslyFocused?.focus?.();
    };
  }, [open, handleClose]);

  if (!open || !mounted) return null;

  const heading = recipient
    ? `Message ${recipient.name}`
    : kind === "quote"
      ? "Request a quote"
      : "Send a message";

  /* Shared input skin. Hairline on white, ink on focus — the same treatment as
     the header search field and the directory filter bar, rather than the
     rounded-lg / #002abf ring this dialog used to carry alone. */
  const FIELD =
    "block w-full rounded-md border border-hairline bg-white px-3 py-2 font-body text-[14px] text-ink " +
    "placeholder:text-muted/70 transition-colors focus:border-ink/40 focus:outline-none " +
    "focus:ring-2 focus:ring-ink/10 disabled:opacity-60";
  const LABEL = "block font-body text-[12px] uppercase tracking-[0.1em] text-muted";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-lead-title"
    >
      <div className="absolute inset-0 bg-ink/50" aria-hidden onClick={handleClose} />

      {/*
        ── ONE COLUMN, THREE BANDS ──────────────────────────────────────────
        Header and footer are shrink-0; only the middle scrolls. That is what
        keeps the send button on screen on a short viewport instead of pushing
        it below the fold, which is the failure the brief describes.

        `100dvh` rather than `100vh`: on a phone the software keyboard shrinks
        the visual viewport, and vh does not notice. The whole point of capping
        the height is to keep the actions reachable while typing.
      */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-32px)] w-full max-w-[560px] flex-col
                   overflow-hidden rounded-xl border border-hairline bg-cream
                   shadow-[0_24px_60px_rgba(22,22,22,0.18)] outline-none
                   sm:max-h-[calc(100dvh-48px)]"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="contact-lead-title"
              className="font-display text-[19px] leading-tight tracking-[-0.01em] text-ink"
            >
              {heading}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center
                         rounded-full text-muted transition-colors hover:bg-stone/50 hover:text-ink
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
            >
              <X strokeWidth={1.5} className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/*
            Who this is going to. From a profile that is the studio; from a
            listing it stays the listing, which is what those four callers
            have always shown.
          */}
          {recipient ? (
            <div className="mt-3 flex items-center gap-3">
              <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-stone">
                {recipient.avatarUrl ? (
                  <Image src={recipient.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[13px] text-muted">
                    {recipient.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-body text-[14px] text-ink">{recipient.name}</span>
                {recipient.meta && (
                  <span className="block truncate font-body text-[12.5px] text-muted">
                    {recipient.meta}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <p className="mt-1 truncate font-body text-[13px] text-muted">About: {listingTitle}</p>
          )}
        </div>

        {status === "success" ? (
          <div className="px-6 py-10 text-center">
            <p className="font-body text-[15px] text-ink">Submitted for review.</p>
            <p className="mx-auto mt-1.5 max-w-[40ch] font-body text-[13.5px] text-muted">
              The listing owner will be notified once your message is approved.
            </p>
            <button type="button" onClick={handleClose} className={`${BTN_PILL_PRIMARY} mt-6`}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            {/* ── Scrolling body ───────────────────────────────────── */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {errorMessage && (
                <p
                  className="mb-4 border-l-2 border-red-500 bg-red-500/[0.06] px-3 py-2 font-body text-[13px] text-red-700"
                  role="alert"
                >
                  {errorMessage}
                </p>
              )}

              {/* Two up on desktop. The dialog was narrow AND tall; the fields
                  that fit side by side are the cheapest height to give back. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className={LABEL}>
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={sender_name}
                    onChange={(e) => setSenderName(e.target.value)}
                    className={`mt-1.5 ${FIELD}`}
                    placeholder="Your name"
                    disabled={status === "submitting"}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className={LABEL}>
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={sender_email}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className={`mt-1.5 ${FIELD}`}
                    placeholder="you@example.com"
                    disabled={status === "submitting"}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="contact-company" className={LABEL}>
                  Company (optional)
                </label>
                <input
                  id="contact-company"
                  type="text"
                  value={sender_company}
                  onChange={(e) => setSenderCompany(e.target.value)}
                  className={`mt-1.5 ${FIELD}`}
                  placeholder="Your company"
                  disabled={status === "submitting"}
                />
              </div>

              {/* Quote-only. Every field optional: a quote with just a message
                  is still a real quote worth forwarding, and a wall of required
                  fields is how an enquiry form stops being used. */}
              {kind === "quote" && (
                <div className="mt-4 grid grid-cols-1 gap-4 border-t border-hairline pt-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="quote-project" className={LABEL}>
                      Project (optional)
                    </label>
                    <input
                      id="quote-project"
                      type="text"
                      value={project_name}
                      onChange={(e) => setProjectName(e.target.value)}
                      className={`mt-1.5 ${FIELD}`}
                      placeholder="Where it will be specified"
                      disabled={status === "submitting"}
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-quantity" className={LABEL}>
                      Quantity (optional)
                    </label>
                    <input
                      id="quote-quantity"
                      type="text"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className={`mt-1.5 ${FIELD}`}
                      placeholder="e.g. 40–60 units"
                      disabled={status === "submitting"}
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-location" className={LABEL}>
                      Location (optional)
                    </label>
                    <input
                      id="quote-location"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className={`mt-1.5 ${FIELD}`}
                      placeholder="Delivery or project location"
                      disabled={status === "submitting"}
                    />
                  </div>
                  <div>
                    <label htmlFor="quote-timeline" className={LABEL}>
                      Desired timeline (optional)
                    </label>
                    <input
                      id="quote-timeline"
                      type="text"
                      value={desired_timeline}
                      onChange={(e) => setDesiredTimeline(e.target.value)}
                      className={`mt-1.5 ${FIELD}`}
                      placeholder="e.g. Q3 2026"
                      disabled={status === "submitting"}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label htmlFor="contact-message" className={LABEL}>
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={`mt-1.5 min-h-[132px] resize-y sm:min-h-[150px] ${FIELD}`}
                  placeholder="Write your message..."
                  disabled={status === "submitting"}
                />
                {/*
                  The minimum this form has always enforced, stated up front
                  rather than only after a rejected submit. NOT a character
                  counter — there is no maximum in the model, and inventing a
                  ceiling to justify a number in the corner would be adding a
                  rule to the product for the sake of the UI.
                */}
                <p className="mt-1.5 text-right font-body text-[12px] text-muted">
                  Minimum {MIN_MESSAGE_LENGTH} characters
                </p>
              </div>
            </div>

            {/* ── Footer, always on screen ─────────────────────────── */}
            <div className="shrink-0 border-t border-hairline bg-cream px-5 py-3.5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full px-3 py-2 font-body text-[13px] text-muted transition-colors
                             hover:text-ink focus-visible:outline-none focus-visible:ring-2
                             focus-visible:ring-ink/25"
                >
                  Cancel
                </button>
                <button type="submit" disabled={status === "submitting"} className={BTN_PILL_PRIMARY}>
                  {status === "submitting"
                    ? "Sending…"
                    : kind === "quote"
                      ? "Send request"
                      : "Send Message"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

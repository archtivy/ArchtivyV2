"use client";

import { useState, useCallback } from "react";

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
}

const MIN_MESSAGE_LENGTH = 15;

export function ContactLeadModal({
  open,
  onClose,
  listingId,
  listingType,
  listingTitle,
  kind = "contact",
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-lead-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={handleClose}
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
          <h2 id="contact-lead-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {kind === "quote" ? "Request a Quote" : "Contact via Archtivy"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            About: {listingTitle}
          </p>
        </div>

        {status === "success" ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Submitted for review.
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              The listing owner will be notified once your message is approved.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {errorMessage && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            )}
            <div>
              <label htmlFor="contact-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name *
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={sender_name}
                onChange={(e) => setSenderName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Your name"
                disabled={status === "submitting"}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email *
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={sender_email}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="you@example.com"
                disabled={status === "submitting"}
              />
            </div>
            <div>
              <label htmlFor="contact-company" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Company <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="contact-company"
                type="text"
                value={sender_company}
                onChange={(e) => setSenderCompany(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Your company"
                disabled={status === "submitting"}
              />
            </div>
            {/* Quote-only. Every field optional: a quote with just a message
                is still a real quote worth forwarding, and a wall of required
                fields is how an enquiry form stops being used. */}
            {kind === "quote" && (
              <div className="space-y-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div>
                <label htmlFor="quote-project" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Project <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="quote-project"
                  type="text"
                  value={project_name}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Where it will be specified"
                  disabled={status === "submitting"}
                />
              </div>
              <div>
                <label htmlFor="quote-quantity" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Quantity <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="quote-quantity"
                  type="text"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. 40–60 units"
                  disabled={status === "submitting"}
                />
              </div>
              <div>
                <label htmlFor="quote-location" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Location <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="quote-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Delivery or project location"
                  disabled={status === "submitting"}
                />
              </div>
              <div>
                <label htmlFor="quote-timeline" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Desired timeline <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  id="quote-timeline"
                  type="text"
                  value={desired_timeline}
                  onChange={(e) => setDesiredTimeline(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. Q3 2026"
                  disabled={status === "submitting"}
                />
              </div>
              </div>
            )}
            <div>
              <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Message * <span className="text-zinc-400">(min {MIN_MESSAGE_LENGTH} characters)</span>
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-[#002abf] focus:outline-none focus:ring-1 focus:ring-[#002abf] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="Your message..."
                disabled={status === "submitting"}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "submitting"}
                className="flex-1 rounded-lg bg-[#002abf] px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 disabled:opacity-50"
              >
                {status === "submitting" ? "Sending…" : "Send for review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

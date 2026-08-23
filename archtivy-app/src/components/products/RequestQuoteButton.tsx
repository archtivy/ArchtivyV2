"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ContactLeadModal } from "@/components/listing/ContactLeadModal";

/**
 * "Request a Quote" on the product detail page.
 *
 * ── WHAT THIS REPLACES ──────────────────────────────────────────────────────
 * A link to /contact, carrying the note "STUB — no quote-request flow, table
 * or endpoint exists". That was wrong when it was written: `leads`,
 * POST /api/leads, the /admin/leads moderation queue and ContactLeadModal all
 * existed and worked. What happened is that the detail pages were rebuilt, and
 * the new ProductDetailView did not remount the modal — so the pipeline kept
 * running with nothing feeding it, and the button became a redirect to a
 * general contact form that says nothing about which product it is about.
 *
 * This exists as a separate client component because ProductDetailView is a
 * server component: the modal needs open/close state, and lifting that into
 * the page would make the whole detail page client-rendered to hold one
 * boolean.
 */
export function RequestQuoteButton({
  listingId,
  listingTitle,
}: {
  listingId: string;
  listingTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink transition-colors hover:bg-stone/50"
      >
        Request a Quote
        <Mail strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
      </button>

      <ContactLeadModal
        open={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        listingType="product"
        listingTitle={listingTitle}
        kind="quote"
      />
    </>
  );
}

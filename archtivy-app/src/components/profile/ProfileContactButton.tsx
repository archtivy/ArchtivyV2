"use client";

import { useState } from "react";
import { ContactLeadModal } from "@/components/listing/ContactLeadModal";
import { BTN_PILL_SECONDARY } from "@/components/ui/publicButton";

export interface ProfileContactButtonProps {
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
  /**
   * The profile being messaged, forwarded to the modal's header.
   *
   * Purely presentational: the lead is still recorded against `listingId`,
   * because that is what the data model stores. This exists so the dialog can
   * say who it is addressed to instead of naming one of their products.
   */
  recipient?: {
    name: string;
    avatarUrl?: string | null;
    meta?: string | null;
  } | null;
  className?: string;
}

/**
 * Message — the secondary action beside Follow.
 *
 * Behaviour unchanged: still opens ContactLeadModal seeded with the profile's
 * first listing, because leads are recorded against a listing rather than a
 * profile. Only the class string moved, from the legacy `rounded border
 * border-zinc-200 bg-white ... dark:` set to the public secondary pill, so it
 * matches Follow's height and radius instead of sitting a few pixels short of
 * it with a 4px corner against a 999px one.
 */
export function ProfileContactButton({
  listingId,
  listingType,
  listingTitle,
  recipient = null,
  className = "",
}: ProfileContactButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BTN_PILL_SECONDARY} ${className}`}
        aria-label="Contact via Archtivy"
      >
        Message
      </button>
      <ContactLeadModal
        open={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        listingType={listingType}
        listingTitle={listingTitle}
        recipient={recipient}
      />
    </>
  );
}

"use client";

import { useState } from "react";
import { ContactLeadModal } from "@/components/listing/ContactLeadModal";

export interface ProfileContactButtonProps {
  listingId: string;
  listingType: "project" | "product";
  listingTitle: string;
  className?: string;
}

const ctaClass =
  "inline-flex items-center gap-2 rounded border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950";

export function ProfileContactButton({
  listingId,
  listingType,
  listingTitle,
  className = "",
}: ProfileContactButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={ctaClass + " " + className}
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
      />
    </>
  );
}

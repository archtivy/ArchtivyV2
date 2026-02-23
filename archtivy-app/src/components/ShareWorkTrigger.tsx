"use client";

import { useState, type ReactNode } from "react";
import { ShareWorkChooser } from "@/components/ShareWorkChooser";

interface ShareWorkTriggerProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Button that opens the Share Work chooser modal.
 * Use in server-rendered areas (e.g. Footer) where ShareCTA is not used.
 */
export function ShareWorkTrigger({ className, children }: ShareWorkTriggerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
      >
        {children ?? "Share your work"}
      </button>
      <ShareWorkChooser open={open} onClose={() => setOpen(false)} />
    </>
  );
}

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ShareWorkChooser } from "@/components/ShareWorkChooser";

/**
 * Primary "Create" action for the editorial header.
 *
 * ── WHY THIS EXISTS WHEN ShareCTA ALREADY DOES ──────────────────────────────
 * The app has two headers. TopNav (via SiteShell) has carried a working
 * ShareCTA -> ShareWorkChooser for a while, but SiteShell routes the editorial
 * pages — "/", /projects, /products, /designers, /brands, /magazine,
 * /inspiration and both wizards — to HomeNav instead, which had no create
 * entry point at all, on desktop or in the mobile drawer.
 *
 * So a signed-in user on the HOMEPAGE, the likeliest starting point, had no
 * door to the publish wizard, while the same user on a profile page did.
 *
 * This reuses ShareWorkChooser rather than forking it, so both headers open the
 * same chooser and the Project/Product routing cannot drift. What it does not
 * reuse is ShareCTA itself: that takes `userId` and `role` as props from a
 * server component, and HomeNav is a client component with neither. It is only
 * rendered inside <SignedIn>, so the signed-out redirect branch ShareCTA
 * handles is unreachable here.
 *
 * ── ROLE GATING LIVES IN THE CALLER ─────────────────────────────────────────
 * HomeNav renders this only when usePublisherRole() says the account may
 * publish, so this component takes no role prop and makes no role decision.
 *
 * A previous version of this note claimed the `reader` role needed no
 * special-casing because "creation is role-checked server-side in the action".
 * That was only half true: createProjectCanonical checked `role !== "designer"`,
 * but createProductCanonical checked nothing beyond onboarding, and neither
 * /add/product nor /add/project guarded its route. A reader could publish a
 * live product. Both actions and both routes now enforce the rule; this button
 * is the cosmetic layer over it, not the guard.
 */
export function HomeNavCreateButton({ onDark = false }: { onDark?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5",
          "font-body text-[13px] font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          onDark
            ? "bg-cream text-ink hover:bg-cream/90 focus:ring-cream focus:ring-offset-zinc-950"
            : "bg-ink text-cream hover:bg-ink/90 focus:ring-ink/25 focus:ring-offset-cream",
        ].join(" ")}
      >
        <Plus strokeWidth={2} className="h-4 w-4" aria-hidden />
        Create
      </button>
      <ShareWorkChooser open={open} onClose={() => setOpen(false)} />
    </>
  );
}

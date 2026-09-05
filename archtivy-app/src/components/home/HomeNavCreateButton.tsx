"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMobilePanelPosition } from "@/lib/hooks/useMobilePanelPosition";
import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Primary "Create" action for the editorial header.
 *
 * ── A DROPDOWN, NOT A MODAL ─────────────────────────────────────────────────
 * This used to open ShareWorkChooser — a full-screen overlay with a backdrop
 * and a focus trap — to ask a single two-option question. The question is now
 * answered in a menu anchored under the button: no overlay, nothing dimmed,
 * and the page stays where it was.
 *
 * The DESTINATIONS are unchanged: /add/project and /add/product, the same two
 * hrefs the chooser used. Only the selection surface changed; neither creation
 * flow is touched.
 *
 * ShareWorkChooser itself is left in place — ShareCTA (TopNav) and
 * ShareWorkTrigger (Footer) still use it, and both are labelled "Share your
 * work" rather than "Create". Converting those is a separate decision.
 *
 * ── ROLE GATING LIVES IN THE CALLER ─────────────────────────────────────────
 * HomeNav renders this only when usePublisherRole() says the account may
 * publish, so this component takes no role prop and makes no role decision.
 * The real guard is server-side: both /add routes and both create actions
 * enforce the rule. This is the cosmetic layer over it.
 */

const ITEMS = [
  { href: "/add/project", label: "Project", hint: "Share an architectural project" },
  { href: "/add/product", label: "Product", hint: "Share a product or material" },
] as const;

export function HomeNavCreateButton({ onDark = false }: { onDark?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  /* Phones position this against the viewport instead of the trigger — see
     useMobilePanelPosition. Undefined at md and up, where the `md:` classes
     below keep the anchored dropdown exactly as it was. */
  const mobilePos = useMobilePanelPosition(triggerRef, open);

  const close = useCallback(
    (returnFocus = false) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    []
  );

  // Outside click and Escape. Escape returns focus to the trigger, a click
  // elsewhere does not — the pointer has already moved on.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // Opening moves focus into the menu, so the keyboard path is Enter → arrow
  // → Enter rather than Enter then a tab through the rest of the header.
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const onItemKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = e.key === "ArrowDown" ? i + 1 : i - 1;
      const wrapped = (next + ITEMS.length) % ITEMS.length;
      itemRefs.current[wrapped]?.focus();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
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

      {open && (
        <div
          role="menu"
          aria-label="Create"
          /*
            Phones: fixed between two 16px gutters, so the width is whatever
            the viewport allows and neither edge can overhang. `top` comes from
            the trigger's measured bottom. md and up: the original anchored
            dropdown, right-aligned to the button at its fixed 296px.
          */
          className="fixed left-4 right-4 z-50 overflow-y-auto overscroll-contain rounded-xl border border-hairline bg-cream shadow-lg md:absolute md:left-auto md:right-0 md:top-[calc(100%+8px)] md:w-[296px] md:overflow-hidden"
          style={mobilePos ? { top: mobilePos.top, maxHeight: mobilePos.maxHeight } : undefined}
        >
          <p className="border-b border-hairline px-4 py-2.5 font-body text-[11px] uppercase tracking-[0.12em] text-muted">
            Create
          </p>
          {ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              onClick={() => close()}
              onKeyDown={(e) => onItemKeyDown(e, i)}
              className="block px-4 py-3 transition-colors hover:bg-stone/35 focus:bg-stone/35 focus:outline-none"
            >
              <span className="block font-body text-[14px] text-ink">{item.label}</span>
              <span className="mt-0.5 block font-body text-[12px] leading-[17px] text-muted">
                {item.hint}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  ChevronDown,
  User,
  Pencil,
  TrendingUp,
  Settings,
  LogOut,
  FolderDown,
  type LucideIcon,
} from "lucide-react";

/**
 * Profile dropdown for the editorial header.
 *
 * ── ON "PROMOTE" ────────────────────────────────────────────────────────────
 * Rendered as a DISABLED row with a "Coming soon" tag, not a link. The brief
 * said placeholder destination only, and the real flow is blocked on Stripe.
 *
 * /me/promote does exist and would have been the obvious target — but
 * site_settings.feature_listing_enabled is currently `true`, so that route
 * renders its full PromoteDashboard rather than the "Coming Soon" state it
 * falls back to when the flag is off. Linking there would have pointed at
 * something that looks finished and cannot take payment. A non-interactive row
 * is the honest version, and it needs no new placeholder route to maintain.
 *
 * ── ON "EDIT PROFILE" ───────────────────────────────────────────────────────
 * Points at /me/profile, which follows the established /me/* convention for
 * personal surfaces. No edit route exists yet anywhere in the app — the full
 * edit UI arrives with the User Profile page — so this ships with a minimal
 * honest placeholder at that path rather than a 404.
 *
 * "Files" links to /me/files — the download capability already existed (60
 * listing_documents, sign-in gated); only the ledger was missing.
 */

interface MenuItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  /** Renders as a non-interactive row with a tag instead of a link. */
  disabledNote?: string;
}

const ITEMS: MenuItem[] = [
  // /me resolves the username server-side and redirects to /u/[username], so
  // the menu does not need to know it.
  { label: "View Profile", href: "/me", icon: User },
  { label: "Edit Profile", href: "/me/profile", icon: Pencil },
  { label: "Files", href: "/me/files", icon: FolderDown },
  { label: "Promote", icon: TrendingUp, disabledNote: "Coming soon" },
  { label: "Account Settings", href: "/me/settings", icon: Settings },
];

function initialsFrom(name: string | null | undefined, fallback: string): string {
  const source = (name ?? "").trim() || fallback;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function HeaderProfileMenu({ onDark }: { onDark: boolean }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = user?.fullName || user?.username || null;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const avatar = user?.imageUrl;
  const initials = initialsFrom(displayName, email || "?");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className={[
          "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors",
          onDark ? "hover:bg-cream/10" : "hover:bg-stone/50",
        ].join(" ")}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            className="h-7 w-7 rounded-full border border-hairline object-cover"
          />
        ) : (
          <span
            className={[
              "flex h-7 w-7 items-center justify-center rounded-full border font-body text-[11px] font-medium",
              onDark ? "border-cream/40 text-cream" : "border-ink/20 bg-stone/40 text-ink",
            ].join(" ")}
            aria-hidden
          >
            {initials}
          </span>
        )}
        <ChevronDown
          strokeWidth={1.5}
          className={[
            "h-4 w-4 transition-transform duration-150",
            open ? "rotate-180" : "",
            onDark ? "text-cream" : "text-ink",
          ].join(" ")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-[100] mt-2 w-[248px] overflow-hidden rounded-2xl border border-hairline bg-cream shadow-[0_12px_40px_rgba(22,22,22,0.12)]"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate font-body text-[14px] font-medium text-ink">
              {displayName ?? "Your account"}
            </p>
            {email && <p className="truncate font-body text-[12px] text-muted">{email}</p>}
          </div>

          <ul className="py-1.5">
            {ITEMS.map((item) => {
              const Icon = item.icon;
              if (item.disabledNote) {
                return (
                  <li key={item.label}>
                    <div
                      className="flex items-center gap-2.5 px-4 py-2.5 font-body text-[14px] text-muted"
                      aria-disabled="true"
                    >
                      <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                      <span className="ml-auto rounded-full bg-stone/60 px-2 py-0.5 font-body text-[11px] text-muted">
                        {item.disabledNote}
                      </span>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.label}>
                  <Link
                    href={item.href!}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/40"
                  >
                    <Icon strokeWidth={1.5} className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-hairline py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void signOut({ redirectUrl: "/" });
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-body text-[14px] text-ink transition-colors hover:bg-stone/40"
            >
              <LogOut strokeWidth={1.5} className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

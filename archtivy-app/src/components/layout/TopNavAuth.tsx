"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";

import type { ProfileRole } from "@/lib/auth/config";

function isClerkConfigured(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return false;
  if (pk === "pk_test_xxxx" || pk === "pk_live_xxxx") return false;
  return true;
}

// ─── Icons (all 16px, stroke-width 1.75, outline) ─────────────────────────────

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconSliders({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}

function IconLogOut({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopNavAuthProps {
  displayName?: string | null;
  role?: ProfileRole | undefined;
  locationCity?: string | null;
}

// ─── Shared classes ───────────────────────────────────────────────────────────

const itemCls =
  "group flex w-full items-center gap-2.5 rounded px-3 py-[7px] text-left text-[13px] font-medium text-zinc-700 transition-colors duration-100 hover:bg-[#f0f4ff] hover:text-[#002abf] focus:outline-none focus-visible:bg-[#f0f4ff] focus-visible:text-[#002abf] dark:text-zinc-300 dark:hover:bg-[#001a7a]/20 dark:hover:text-[#4d7cff]";

const iconCls =
  "shrink-0 text-zinc-400 transition-colors duration-100 group-hover:text-[#002abf] dark:text-zinc-500 dark:group-hover:text-[#4d7cff]";

// ─── Animated dropdown shell ──────────────────────────────────────────────────

function DropdownPanel({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="menu"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-5px)",
        transition: "opacity 130ms ease-out, transform 130ms ease-out",
      }}
      className="absolute right-0 top-full z-[100] mt-2 w-64 overflow-hidden rounded border border-zinc-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] dark:border-zinc-700/80 dark:bg-zinc-900 dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
    >
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopNavAuth({ displayName, role, locationCity }: TopNavAuthProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const name =
    displayName ??
    (user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : user?.primaryEmailAddress?.emailAddress ?? "Account");

  const imageUrl = user?.imageUrl ?? null;
  const showListings = role === "designer" || role === "brand";
  const roleLabel =
    role === "designer" ? "Designer" : role === "brand" ? "Brand" : null;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, close]);

  if (!isClerkConfigured()) {
    return (
      <Link
        href="/sign-in"
        className="rounded px-2 py-1 text-[13px] font-medium text-zinc-500 transition hover:text-zinc-900 focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      {/* ─── Signed out ──────────────────────────────────────────────────── */}
      <SignedOut>
        <div className="flex items-center gap-0.5">
          <Link
            href="/sign-in"
            className="rounded px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:text-[#002abf] focus:outline-none dark:text-zinc-300 dark:hover:text-[#4d7cff]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded px-2.5 py-1.5 text-[13px] font-medium text-zinc-700 transition-colors hover:text-[#002abf] focus:outline-none dark:text-zinc-300 dark:hover:text-[#4d7cff]"
          >
            Sign up
          </Link>
        </div>
      </SignedOut>

      {/* ─── Signed in ───────────────────────────────────────────────────── */}
      <SignedIn>
        {/*
          OVERFLOW NOTE:
          This wrapper is `relative` but has NO overflow-hidden.
          The header has no overflow-hidden either.
          The dropdown (absolute, z-[100]) renders freely below the header.
        */}
        <div className="relative" ref={containerRef}>

          {/* Trigger */}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-haspopup="true"
            aria-label="Account menu"
            className="flex items-center gap-1.5 rounded px-1.5 py-1 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002abf]/20 dark:hover:bg-zinc-800"
          >
            {/* Avatar circle */}
            <span className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-[1.5px] ring-zinc-300/60 dark:bg-zinc-700 dark:ring-zinc-600/60">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  width={30}
                  height={30}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  {name[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </span>

            {/* Name label — hidden on xs, visible sm+ */}
            <span className="hidden max-w-[110px] truncate text-[13px] font-medium text-zinc-800 sm:block dark:text-zinc-100">
              {name}
            </span>

            {/* Chevron — rotates when open */}
            <IconChevronDown
              className={[
                "hidden shrink-0 text-zinc-400 transition-transform duration-150 sm:block dark:text-zinc-500",
                open ? "rotate-180" : "rotate-0",
              ].join(" ")}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <DropdownPanel>

              {/* Profile summary */}
              <div className="flex items-center gap-3 px-3.5 pb-3 pt-3.5">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-[1.5px] ring-zinc-100 dark:bg-zinc-700 dark:ring-zinc-700">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-zinc-600 dark:text-zinc-300">
                      {name[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                    {name}
                  </p>
                  {(roleLabel || locationCity) && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px]">
                      {roleLabel && (
                        <span className="font-medium text-zinc-500 dark:text-zinc-400">
                          {roleLabel}
                        </span>
                      )}
                      {roleLabel && locationCity && (
                        <span className="h-2.5 w-px shrink-0 bg-zinc-300 dark:bg-zinc-600" aria-hidden />
                      )}
                      {locationCity && (
                        <span className="truncate text-zinc-400 dark:text-zinc-500">
                          {locationCity}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div role="separator" className="border-t border-zinc-100 dark:border-zinc-800" />

              {/* Nav items */}
              <div role="none" className="px-1.5 py-1.5">
                <Link role="menuitem" href="/me" className={itemCls} onClick={close}>
                  <IconUser className={iconCls} />
                  Profile
                </Link>

                {showListings && (
                  <Link role="menuitem" href="/me/listings" className={itemCls} onClick={close}>
                    <IconGrid className={iconCls} />
                    My Listings
                  </Link>
                )}

                <Link role="menuitem" href="/me/saved" className={itemCls} onClick={close}>
                  <IconBookmark className={iconCls} />
                  Saved
                </Link>

                <Link role="menuitem" href="/me/settings" className={itemCls} onClick={close}>
                  <IconSliders className={iconCls} />
                  Settings
                </Link>
              </div>

              {/* Divider */}
              <div role="separator" className="border-t border-zinc-100 dark:border-zinc-800" />

              {/* Sign out */}
              <div role="none" className="px-1.5 py-1.5">
                <button
                  type="button"
                  role="menuitem"
                  className={itemCls}
                  onClick={() => {
                    close();
                    signOut({ redirectUrl: "/" });
                  }}
                >
                  <IconLogOut className={iconCls} />
                  Sign out
                </button>
              </div>

            </DropdownPanel>
          )}
        </div>
      </SignedIn>
    </>
  );
}

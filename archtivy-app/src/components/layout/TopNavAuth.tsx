"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";

function isClerkConfigured(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!pk) return false;
  if (pk === "pk_test_xxxx" || pk === "pk_live_xxxx") return false;
  return true;
}

import type { ProfileRole } from "@/lib/auth/config";

/** Folder/collection icon for Saved (not heart or star). */
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

interface TopNavAuthProps {
  displayName?: string | null;
  role?: ProfileRole | undefined;
}

const itemClass =
  "flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-sm font-medium text-[#1a1a1a] transition hover:bg-[#f5f7fb] focus:outline-none focus:outline-2 focus:outline-offset-0 focus:outline-[rgba(0,42,191,0.15)] dark:text-zinc-100 dark:hover:bg-zinc-800";

export function TopNavAuth({ displayName, role }: TopNavAuthProps) {
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

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  if (!isClerkConfigured()) {
    return (
      <Link
        href="/sign-in"
        className="rounded px-2 py-1 text-zinc-500 transition hover:text-zinc-900 focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus:text-zinc-100"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <SignedOut>
        <Link
          href="/sign-in"
          className="rounded px-2 py-1 text-[15px] font-medium text-[#2b2b2b] transition-colors hover:text-[#002abf] focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[rgba(0,42,191,0.15)] dark:text-zinc-300 dark:hover:text-[#002abf]"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded px-2 py-1 text-[15px] font-medium text-[#2b2b2b] transition-colors hover:text-[#002abf] focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[rgba(0,42,191,0.15)] dark:text-zinc-300 dark:hover:text-[#002abf]"
        >
          Sign up
        </Link>
      </SignedOut>
      <SignedIn>
        <div className="relative" ref={containerRef}>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-haspopup="true"
            aria-label="Account menu"
            className="flex items-center gap-2 rounded-lg py-1 pr-1 text-left transition hover:bg-zinc-100 focus:outline-none focus:outline-2 focus:outline-offset-2 focus:outline-[rgba(0,42,191,0.15)] dark:hover:bg-zinc-800"
          >
            <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  {name[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </span>
            <span className="max-w-[120px] truncate text-sm font-medium text-zinc-900 sm:max-w-[160px] dark:text-zinc-100">
              {name}
            </span>
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2.5 min-w-[200px] rounded-lg border border-zinc-200/80 bg-white py-3 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-xl"
            >
              {/* Menu items only (no user name/role inside dropdown) */}
              <div role="none" className="px-1 py-0.5">
                <Link
                  role="menuitem"
                  href="/me"
                  className={itemClass}
                  onClick={close}
                >
                  Profile
                </Link>
                {showListings && (
                  <Link
                    role="menuitem"
                    href="/me/listings"
                    className={itemClass}
                    onClick={close}
                  >
                    Listings
                  </Link>
                )}
                <Link
                  role="menuitem"
                  href="/me/saved"
                  className={itemClass}
                  onClick={close}
                >
                  <FolderIcon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  Saved
                </Link>
                <Link
                  role="menuitem"
                  href="/me/settings"
                  className={itemClass}
                  onClick={close}
                >
                  Settings
                </Link>
              </div>

              <div
                role="separator"
                className="my-2 border-t border-[#f0f0f0] dark:border-zinc-700"
              />

              <div role="none" className="px-1 py-0.5">
                <button
                  type="button"
                  role="menuitem"
                  className={`${itemClass} w-full text-left`}
                  onClick={() => {
                    close();
                    signOut({ redirectUrl: "/" });
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}

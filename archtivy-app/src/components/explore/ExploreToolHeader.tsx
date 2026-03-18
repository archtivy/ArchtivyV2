"use client";

import Link from "next/link";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useRef } from "react";
import { ShareCTA } from "@/components/layout/ShareCTA";
import type { ProfileRole } from "@/lib/auth/config";

interface ProfileData {
  userId: string | null;
  role: ProfileRole | undefined;
  displayName: string | null;
  avatarUrl: string | null;
}

export function ExploreToolHeader() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<ProfileData>({
    userId: null,
    role: undefined,
    displayName: null,
    avatarUrl: null,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setProfile({ userId: null, role: undefined, displayName: null, avatarUrl: null });
      return;
    }
    let cancelled = false;
    fetch("/api/user-profile-data")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProfile({
          userId: data.userId ?? null,
          role: data.role,
          displayName: data.displayName ?? null,
          avatarUrl: data.avatarUrl ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({ userId: user.id, role: undefined, displayName: null, avatarUrl: null });
        }
      });
    return () => { cancelled = true; };
  }, [isLoaded, user?.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const userId = isLoaded && user?.id ? user.id : profile.userId ?? null;
  const name =
    profile.displayName ??
    (user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : null);
  const initials = (name ?? "A")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const avatarUrl = profile.avatarUrl ?? user?.imageUrl ?? null;

  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-4">
      {/* Left: Logo + back */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-600"
          title="Back to Archtivy"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <Link
          href="/"
          className="text-lg font-semibold tracking-[0.08em] text-[#002abf]"
        >
          archtivy
        </Link>
        <span className="hidden h-4 w-px bg-zinc-200 sm:block" />
        <span className="hidden text-xs font-medium text-zinc-400 sm:block">Explore</span>
      </div>

      {/* Right: Share CTA + user */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <ShareCTA userId={userId} role={profile.role} />
        </div>

        <SignedIn>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-zinc-200"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-zinc-100 text-xs font-semibold text-zinc-600">
                  {initials}
                </span>
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 shadow-xl ring-1 ring-zinc-200/60">
                {name && (
                  <div className="border-b border-zinc-100 px-4 py-3">
                    <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
                    <p className="truncate text-xs text-zinc-400">{profile.role ?? "Member"}</p>
                  </div>
                )}
                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  My Profile
                </Link>
                <Link
                  href="/me/saved"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                  Saved
                </Link>
                <Link
                  href="/me/listings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                  My Listings
                </Link>
                <div className="my-1 border-t border-zinc-100" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
                >
                  <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </SignedIn>

        <SignedOut>
          <Link
            href="/sign-in"
            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Sign in
          </Link>
        </SignedOut>
      </div>
    </header>
  );
}

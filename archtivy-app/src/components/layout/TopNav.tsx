"use client";

import Link from "next/link";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Container } from "@/components/layout/Container";
import { TopNavAuth } from "@/components/layout/TopNavAuth";
import { ShareCTA } from "@/components/layout/ShareCTA";
import { TopNavLinks } from "@/components/layout/TopNavLinks";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { NotificationBell } from "@/components/notifications/NotificationBell";

import type { ProfileRole } from "@/lib/auth/config";

interface ProfileData {
  userId: string | null;
  role: ProfileRole | undefined;
  displayName: string | null;
  locationCity: string | null;
}

// Desktop nav — used by TopNavLinks (unchanged)
const navLinks = [
  { href: "/explore/projects", label: "Projects" },
  { href: "/explore/products", label: "Products" },
  { href: "/explore/designers", label: "Designers" },
  { href: "/explore/brands", label: "Brands" },
  { href: "/explore", label: "Explore" },
];

// Mobile drawer nav — core exploration only, no footer duplicates
const mobileNavLinks = [
  { href: "/explore/projects", label: "Projects" },
  { href: "/explore/products", label: "Products" },
  { href: "/explore/designers", label: "Designers" },
  { href: "/explore/brands", label: "Brands" },
];

export function TopNav() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<ProfileData>({
    userId: null,
    role: undefined,
    displayName: null,
    locationCity: null,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setProfile({ userId: null, role: undefined, displayName: null, locationCity: null });
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
          locationCity: data.locationCity ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({ userId: user.id, role: undefined, displayName: null, locationCity: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user?.id]);

  const userId = isLoaded && user?.id ? user.id : profile.userId ?? null;
  const showListings = profile.role === "designer" || profile.role === "brand";
  const name =
    profile.displayName ??
    (user?.firstName || user?.lastName
      ? [user.firstName, user.lastName].filter(Boolean).join(" ")
      : user?.primaryEmailAddress?.emailAddress ?? "Account");

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b bg-[#ffffff] dark:border-zinc-800 dark:bg-zinc-950/95 dark:supports-[backdrop-filter]:bg-zinc-950/80"
        style={{ borderBottomColor: "#e5e7eb" }}
      >
        <Container className="flex items-center justify-between gap-2 py-4 sm:py-5">
          {/* Left: Logo only on mobile; logo + divider + nav on desktop */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="shrink-0 rounded px-1 py-0.5 text-xl font-semibold tracking-[0.08em] text-[#002abf] transition-colors focus:outline-none focus-visible:bg-[#002abf]/10 focus-visible:ring-0 dark:text-[#002abf]"
            >
              archtivy
            </Link>
            <span
              className="hidden h-5 w-px shrink-0 bg-zinc-300 dark:bg-zinc-600 md:block"
              aria-hidden
            />
            <nav className="hidden items-center gap-1 text-sm md:flex md:gap-4" aria-label="Main">
              <TopNavLinks />
            </nav>
          </div>
          {/* Right: Search + desktop controls + hamburger */}
          <div className="flex shrink-0 items-center gap-2">
            <HeaderSearch />
            {/* Desktop only: CTA + auth + theme */}
            <div className="hidden items-center gap-2 md:flex md:gap-4">
              <NotificationBell />
              <ShareCTA userId={userId} role={profile.role} />
              <TopNavAuth
                displayName={profile.displayName}
                role={profile.role}
                locationCity={profile.locationCity}
              />
              <ThemeToggle />
            </div>
            {/* Mobile only: notification bell + hamburger */}
            <div className="flex items-center gap-1.5 md:hidden">
              <NotificationBell mode="link" />
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden
            onClick={closeDrawer}
          />

          {/* Drawer panel: flex-col so bottom area sticks */}
          <div
            className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-sm flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                Menu
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-[4px] p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close menu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Scrollable nav ──────────────────────────────────── */}
            <nav
              className="flex-1 overflow-y-auto px-2 py-3"
              aria-label="Main navigation"
            >
              {mobileNavLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeDrawer}
                  className="flex items-center rounded-[4px] px-4 py-4 text-base font-medium text-zinc-800 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[#002abf] dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* ── Sticky bottom: auth + CTA ───────────────────────── */}
            <div
              className="shrink-0 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              {userId ? (
                /* ── Signed-in ─────────────────────────────────── */
                <>
                  {/* Profile card */}
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <div
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {initials || "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {name}
                      </p>
                      <Link
                        href="/me"
                        onClick={closeDrawer}
                        className="text-xs text-zinc-400 transition hover:text-[#002abf] dark:text-zinc-500 dark:hover:text-[#4d6fff]"
                      >
                        View profile →
                      </Link>
                    </div>
                    <ThemeToggle />
                  </div>

                  {/* Secondary actions */}
                  <div className="flex items-center gap-1 px-4 py-3">
                    {showListings && (
                      <Link
                        href="/me/listings"
                        onClick={closeDrawer}
                        className="rounded-[4px] px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      >
                        Listings
                      </Link>
                    )}
                    <Link
                      href="/me/saved"
                      onClick={closeDrawer}
                      className="rounded-[4px] px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    >
                      Saved
                    </Link>
                    <Link
                      href="/me/following"
                      onClick={closeDrawer}
                      className="rounded-[4px] px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    >
                      Following
                    </Link>
                    <Link
                      href="/me/notifications"
                      onClick={closeDrawer}
                      className="rounded-[4px] px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    >
                      Updates
                    </Link>
                    <Link
                      href="/me/settings"
                      onClick={closeDrawer}
                      className="rounded-[4px] px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => { closeDrawer(); signOut({ redirectUrl: "/" }); }}
                      className="ml-auto rounded-[4px] px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
                    >
                      Sign out
                    </button>
                  </div>

                  {/* Primary CTA — only for designer / brand */}
                  {showListings && (
                    <div className="px-5 pb-5">
                      <Link
                        href="/add/project"
                        onClick={closeDrawer}
                        className="block w-full rounded-[4px] bg-[#002abf] px-4 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
                      >
                        Share your work
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                /* ── Signed-out ─────────────────────────────────── */
                <div className="space-y-2 px-5 py-5">
                  <Link
                    href="/sign-in?redirect_url=/add/project"
                    onClick={closeDrawer}
                    className="block w-full rounded-[4px] bg-[#002abf] px-4 py-3 text-center text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
                  >
                    Share your work
                  </Link>
                  <div className="flex gap-2">
                    <Link
                      href="/sign-in"
                      onClick={closeDrawer}
                      className="flex-1 rounded-[4px] border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={closeDrawer}
                      className="flex-1 rounded-[4px] border border-zinc-200 px-4 py-2.5 text-center text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600"
                    >
                      Sign up
                    </Link>
                  </div>
                  <div className="flex justify-end pt-1">
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

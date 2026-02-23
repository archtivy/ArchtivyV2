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

import type { ProfileRole } from "@/lib/auth/config";

interface ProfileData {
  userId: string | null;
  role: ProfileRole | undefined;
  displayName: string | null;
}

const navLinks = [
  { href: "/explore/projects", label: "Projects" },
  { href: "/explore/products", label: "Products" },
  { href: "/explore/designers", label: "Designers" },
  { href: "/explore/brands", label: "Brands" },
  { href: "/explore", label: "Explore" },
];

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/feedback", label: "Feedback" },
  { href: "/contact", label: "Contact" },
];

export function TopNav() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<ProfileData>({
    userId: null,
    role: undefined,
    displayName: null,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (!isLoaded || !user?.id) {
      setProfile({ userId: null, role: undefined, displayName: null });
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
        });
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({ userId: user.id, role: undefined, displayName: null });
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
          {/* Right: Search + Share CTA + auth + theme on desktop; on mobile: Search + Share + burger */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <HeaderSearch />
            <ShareCTA userId={userId} role={profile.role} />
            <div className="hidden md:block">
              <TopNavAuth displayName={profile.displayName} role={profile.role} />
            </div>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 md:hidden"
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
        </Container>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden
            onClick={closeDrawer}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:hidden"
            role="dialog"
            aria-label="Menu"
          >
            <div className="flex flex-col gap-6 p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Menu
                </span>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-archtivy-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="Close menu"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-1" aria-label="Main">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <SignedOut>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/sign-in"
                      onClick={closeDrawer}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/sign-up"
                      onClick={closeDrawer}
                      className="rounded-lg bg-archtivy-primary px-3 py-2.5 text-center text-sm font-medium text-white hover:opacity-90"
                    >
                      Sign up
                    </Link>
                  </div>
                </SignedOut>
                <SignedIn>
                  <p className="mb-2 truncate px-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {name}
                  </p>
                  <div className="flex flex-col gap-1">
                    <Link href="/me" onClick={closeDrawer} className="rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      Profile
                    </Link>
                    {showListings && (
                      <Link href="/me/listings" onClick={closeDrawer} className="rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                        Listings
                      </Link>
                    )}
                    <Link href="/me/saved" onClick={closeDrawer} className="rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      Saved
                    </Link>
                    <Link href="/me/settings" onClick={closeDrawer} className="rounded-lg px-3 py-2.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        signOut({ redirectUrl: "/" });
                      }}
                      className="rounded-lg px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Sign out
                    </button>
                  </div>
                </SignedIn>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Product
                </p>
                <div className="flex flex-col gap-1">
                  {footerLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeDrawer}
                      className="rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

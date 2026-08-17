"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Menu, X } from "lucide-react";
import { SignedIn, SignedOut, useClerk } from "@clerk/nextjs";
import { HeaderNotificationBell } from "@/components/home/HeaderNotificationBell";
import { HeaderProfileMenu } from "@/components/home/HeaderProfileMenu";

/**
 * Global Primary Nav for the homepage (Build Brief §1).
 *
 * Transparent over the hero photograph, becoming solid cream with a hairline
 * bottom border once the user scrolls past the hero band. That state change is
 * why this is a client component — everything else on the homepage is a server
 * component.
 *
 * Link colour is the only thing that flips between states; nav items never
 * change hue on hover, only underline (Blueprint §16).
 */

const NAV_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Designers", href: "/designers" },
  { label: "Brands", href: "/brands" },
  { label: "Products", href: "/products" },
  { label: "Inspiration", href: "/inspiration" },
  { label: "Magazine", href: "/magazine" },
];

/**
 * `overlay` — transparent over the homepage's dark hero photograph, turning
 *   solid cream on scroll.
 * `solid`   — always solid cream. Required on any page without a dark hero
 *   behind the bar; in overlay mode the cream wordmark and links would render
 *   cream-on-cream and disappear entirely.
 */
export function HomeNav({ variant = "overlay" }: { variant?: "overlay" | "solid" }) {
  const { signOut } = useClerk();
  const [scrolled, setScrolled] = useState(variant === "solid");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (variant === "solid") return;
    // Hero band is ~640px; flip a little before its bottom edge so the
    // transition finishes while the photograph is still behind the bar.
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const onDark = !scrolled;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-hairline bg-cream" : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[72px] max-w-content items-center justify-between px-4 md:px-12 lg:px-24">
        <Link
          href="/"
          className={[
            "font-display text-[22px] font-medium tracking-tight transition-colors",
            onDark ? "text-cream" : "text-ink",
          ].join(" ")}
        >
          archtivy
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={[
                    "font-body text-[15px] underline-offset-[6px] transition-colors hover:underline",
                    onDark ? "text-cream/90 hover:text-cream" : "text-ink/80 hover:text-ink",
                  ].join(" ")}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          {/* Signed out: unchanged — the "For Professionals" CTA is the whole
              point of the logged-out header and stays exactly as it was. */}
          <SignedOut>
            <Link
              href="/sign-up"
              className={[
                "hidden rounded-full border px-4 py-2 font-body text-[13px] transition-colors sm:inline-flex",
                onDark
                  ? "border-cream/40 text-cream hover:bg-cream/10"
                  : "border-ink/25 text-ink hover:bg-stone/50",
              ].join(" ")}
            >
              For Professionals
            </Link>
          </SignedOut>

          {/* Signed in: the CTA is replaced, not supplemented — an account
              holder has no use for a sign-up prompt. */}
          <SignedIn>
            <HeaderNotificationBell onDark={onDark} />
          </SignedIn>

          <Link
            href="/me/saved"
            aria-label="Saved items"
            className={onDark ? "text-cream" : "text-ink"}
          >
            <Bookmark strokeWidth={1.5} className="h-5 w-5" />
          </Link>

          <SignedIn>
            <HeaderProfileMenu onDark={onDark} />
          </SignedIn>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className={onDark ? "text-cream lg:hidden" : "text-ink lg:hidden"}
          >
            {menuOpen ? (
              <X strokeWidth={1.5} className="h-5 w-5" />
            ) : (
              <Menu strokeWidth={1.5} className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer. The primary links must stay reachable below
          lg — responsive adaptation never removes functionality (Blueprint §9). */}
      {menuOpen && (
        <div className="border-t border-hairline bg-cream lg:hidden">
          <ul className="mx-auto max-w-content px-4 py-4 md:px-12">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <SignedOut>
              <li>
                <Link
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 inline-flex rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink"
                >
                  For Professionals
                </Link>
              </li>
            </SignedOut>

            {/* Below lg the account actions live in the drawer rather than the
                bar, so nothing is lost on small screens. */}
            <SignedIn>
              <li className="mt-2 border-t border-hairline pt-2">
                <Link
                  href="/me/notifications"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  Notifications
                </Link>
              </li>
              <li>
                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  View Profile
                </Link>
              </li>
              <li>
                <Link
                  href="/me/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  Edit Profile
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-2 py-3 font-body text-[16px] text-muted">
                  Promote
                  <span className="rounded-full bg-stone/60 px-2 py-0.5 text-[11px]">
                    Coming soon
                  </span>
                </span>
              </li>
              <li>
                <Link
                  href="/me/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  Account Settings
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut({ redirectUrl: "/" });
                  }}
                  className="block w-full py-3 text-left font-body text-[16px] text-ink"
                >
                  Sign Out
                </button>
              </li>
            </SignedIn>
          </ul>
        </div>
      )}
    </header>
  );
}

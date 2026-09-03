"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Menu, X } from "lucide-react";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { SignedIn, useAuth, useClerk } from "@clerk/nextjs";
import { HeaderNotificationBell } from "@/components/home/HeaderNotificationBell";
import { HeaderProfileMenu } from "@/components/home/HeaderProfileMenu";
import { HomeNavCreateButton } from "@/components/home/HomeNavCreateButton";
import { usePublisherRole } from "@/lib/hooks/usePublisherRole";

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
 *
 * ── SEARCH-FIRST ────────────────────────────────────────────────────────────
 * The five section links used to run across the middle of the bar. They now
 * live behind the menu button beside the wordmark, and the space they occupied
 * belongs to the global search field.
 *
 * The reasoning is that this is a discovery platform: the five links name the
 * shelves, and search is how anyone actually finds a thing on them. Giving the
 * shelves the widest real estate on every page made the header a table of
 * contents for a site the visitor is already inside.
 *
 * Nothing is lost — the same five routes, in the same order, one click away —
 * and the account controls on the right are untouched.
 */

const NAV_LINKS = [
  { label: "Projects", href: "/projects" },
  { label: "Designers", href: "/designers" },
  { label: "Brands", href: "/brands" },
  { label: "Products", href: "/products" },
  { label: "Inspiration", href: "/inspiration" },
  // Magazine moved out of the header to the footer. It is already listed in
  // HomeFooter's Explore column, so nothing was added there — this is a
  // removal from the primary nav, not a relocation of the only link.
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
  // NOT <SignedOut>. Clerk's auth components render nothing during SSR in this
  // app — verified against the pre-existing TopNav, whose signed-out "Sign in"
  // link is also absent from server HTML. Wrapping the guest CTA in <SignedOut>
  // therefore dropped "For Professionals" out of the server response entirely,
  // which the brief explicitly required to stay unchanged.
  //
  // Keying off isLoaded instead means the guest CTA is the SSR default: server
  // HTML is byte-identical to before, and no-JS and crawler requests still see
  // it. A signed-in user sees it briefly until hydration swaps in the bell —
  // the acceptable direction for this trade, since the alternative loses the
  // CTA for everyone who matters most.
  const { isLoaded, isSignedIn } = useAuth();
  const showGuestCta = !isLoaded || !isSignedIn;
  // Readers do not publish, so they get no create affordance — not a disabled
  // one. Server-side guards on both wizard routes and both create actions are
  // the actual enforcement; this only stops offering a door that is locked.
  const { canPublish } = usePublisherRole();
  const [scrolled, setScrolled] = useState(variant === "solid");
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  /*
   * Escape and outside-click dismissal, matching HeaderProfileMenu. The panel
   * used to be a drawer that only its own trigger could close, which is
   * tolerable for a full-width sheet and wrong for a popover.
   */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menuOpen]);

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
      ref={headerRef}
      className={[
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled ? "border-b border-hairline bg-cream" : "bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[72px] max-w-content items-center justify-between px-4 md:px-12 lg:px-24">
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/"
            className={[
              "font-display text-[22px] font-medium tracking-tight transition-colors",
              onDark ? "text-cream" : "text-ink",
            ].join(" ")}
          >
            archtivy
          </Link>

          {/* One button at every width. Below lg it also carries the account
              actions, which is why the panel below branches rather than the
              trigger. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className={[
              "-ml-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              onDark
                ? "text-cream hover:bg-cream/10"
                : "text-ink hover:bg-stone/50",
            ].join(" ")}
          >
            {menuOpen ? (
              <X strokeWidth={1.5} className="h-5 w-5" />
            ) : (
              <Menu strokeWidth={1.5} className="h-5 w-5" />
            )}
          </button>
        </div>

        {/*
          The centre of the bar. Wide on desktop, and still a real field on a
          phone rather than an icon that hides one.

          ── EXCEPT OVER THE HOMEPAGE HERO ───────────────────────────────────
          The hero carries its own large search with the popular-search chips
          beneath it, so showing this one at the same time puts two search
          fields on screen 300px apart. The previous header avoided that by
          hiding itself on "/" entirely; this keeps the field but defers it,
          fading in on the same scroll threshold that turns the bar solid —
          by which point the hero field has left the viewport. Search is never
          more than a scroll away, and never doubled.

          Every other surface passes variant="solid", so `scrolled` is true
          from the first paint and the field is simply always there.
        */}
        <div
          className={[
            "mx-4 min-w-0 flex-1 transition-opacity duration-300 md:mx-8 lg:mx-12",
            scrolled ? "opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
          aria-hidden={!scrolled}
        >
          <div className="mx-auto w-full max-w-[720px]">
            <GlobalSearch onDark={onDark} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Signed out: unchanged — the "For Professionals" CTA is the whole
              point of the logged-out header and stays exactly as it was. */}
          {showGuestCta && (
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
          )}

          {/* Signed in: the CTA is replaced, not supplemented — an account
              holder has no use for a sign-up prompt. */}
          <SignedIn>
            {/* Primary action, ahead of the bell: publishing is what an account
                holder is here to do, and until now this header had no route to
                the wizard at all. Publisher roles only — a reader clicking this
                reached a wizard that would refuse the submission. */}
            {canPublish && <HomeNavCreateButton onDark={onDark} />}
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
        </div>
      </div>

      {/*
        ── DESKTOP: A POPOVER, NOT A DRAWER ──────────────────────────────────
        Anchored under the menu button and sized to its content, in the same
        cream / hairline / soft-shadow language as the account menu it sits
        beside. A full-width panel sliding down from the bar would read as a
        mobile navigation drawer that had wandered onto a desktop.
      */}
      {menuOpen && (
        <div className="hidden lg:block">
          <div
            className="absolute left-4 top-[64px] z-50 w-[248px] overflow-hidden rounded-2xl border border-hairline bg-cream py-1.5 shadow-[0_12px_40px_rgba(22,22,22,0.12)] md:left-12 lg:left-24"
            role="menu"
            aria-label="Sections"
          >
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 font-body text-[14px] text-ink transition-colors hover:bg-stone/40"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}

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
            {showGuestCta && (
              <li>
                <Link
                  href="/sign-up"
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 inline-flex rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink"
                >
                  For Professionals
                </Link>
              </li>
            )}

            {/* Below lg the account actions live in the drawer rather than the
                bar, so nothing is lost on small screens. */}
            <SignedIn>
              {/* Two direct links rather than the chooser modal: opening a
                  dialog on top of an open drawer stacks two overlays and traps
                  focus in the wrong one. The destinations are identical.

                  Gated on the same role check as the desktop button — the
                  drawer was the second place a reader was offered the wizard. */}
              {canPublish && (
                <>
                  <li className="mt-2 border-t border-hairline pt-2">
                    <Link
                      href="/add/project"
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 font-body text-[16px] font-medium text-ink"
                    >
                      Share a Project
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/add/product"
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 font-body text-[16px] font-medium text-ink"
                    >
                      Share a Product
                    </Link>
                  </li>
                </>
              )}
              <li className="mt-2 border-t border-hairline pt-2">
                <Link
                  href="/me/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] font-medium text-ink"
                >
                  Dashboard
                </Link>
              </li>
              <li>
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
                  href="/me/files"
                  onClick={() => setMenuOpen(false)}
                  className="block py-3 font-body text-[16px] text-ink"
                >
                  Files
                </Link>
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

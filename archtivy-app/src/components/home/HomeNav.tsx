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
 * ── SEARCH-FIRST, EXCEPT ON THE HOMEPAGE MASTHEAD ───────────────────────────
 * This is a discovery platform: the five section links name the shelves, and
 * search is how anyone actually finds a thing on them. Once a visitor is
 * inside the site, giving the shelves the widest strip of every page turns the
 * header into a table of contents for somewhere they already are — so on every
 * internal page the links collapse behind the menu button and the centre of the
 * bar belongs to search.
 *
 * The top of the homepage is the one place that reasoning does not hold. It is
 * the masthead: the first thing a stranger sees, and the only moment the header
 * has to say what the site contains rather than help someone move around it.
 * There it keeps its original form — the five links spelled out across the bar,
 * no menu button, no search field, because the hero directly beneath already
 * carries a large one of its own.
 *
 * Hence exactly three states, all from `scrolled` on this one component:
 *
 *   1. homepage, at top  wordmark · horizontal links · controls
 *   2. homepage, scrolled  wordmark · menu · search · controls
 *   3. every other page  wordmark · menu · search · controls
 *
 * State 1 crosses into state 2 on the same scroll threshold that turns the bar
 * solid, so the links fade out as the field fades in and the bar gains its
 * background in a single movement rather than three staggered ones.
 *
 * Below `lg` the links have never fitted across the bar; the menu button is the
 * navigation at those widths and therefore stays put in all three states.
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

  /*
   * The homepage masthead: state 1 above. `scrolled` is seeded to true whenever
   * variant is "solid", so every internal page is false here from first paint
   * and never re-evaluates — the correction is scoped to "/" by construction
   * rather than by sniffing the pathname.
   */
  const masthead = variant === "overlay" && !scrolled;

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
              // Gone from the masthead, where the links are written out in
              // full — but only at lg, the width they actually fit. Below
              // that this button has always been the whole navigation, and
              // hiding it would leave a homepage with no way through.
              masthead ? "lg:hidden" : "",
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
          The centre of the bar holds the links and the field in the same slot,
          one fading out as the other fades in. They are stacked rather than
          swapped so neither the wordmark nor the account controls shift by a
          pixel as the header changes state — the transition is a change of
          contents, not of layout.

          On the masthead the field is not merely hidden but inert: the hero a
          few hundred pixels below carries its own large search with the
          popular-search chips, and two search boxes that close together is one
          too many. Tab order and the accessibility tree follow the visible
          state, never the stack.
        */}
        <div className="relative mx-4 min-w-0 flex-1 md:mx-8 lg:mx-12">
          {/* State 1. lg and up only — five links have never fitted a phone. */}
          <nav
            aria-label="Primary"
            className={[
              "absolute inset-0 hidden items-center justify-center transition-opacity duration-300 lg:flex",
              masthead ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-hidden={!masthead}
          >
            <ul className="flex items-center gap-8">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    tabIndex={masthead ? undefined : -1}
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

          {/*
            States 2 and 3 — from `md` up only.

            On a phone this slot is barely 180px wide once the wordmark, the
            burger and three account controls have taken their share, which is
            a search box too small to read what you typed into it. The field
            moves to its own full-width row below instead; this one is hidden
            rather than shrunk.
          */}
          <div
            className={[
              "hidden h-full items-center transition-opacity duration-300 md:flex",
              masthead ? "pointer-events-none opacity-0" : "opacity-100",
            ].join(" ")}
            aria-hidden={masthead}
          >
            <div className="mx-auto w-full max-w-[720px]">
              <GlobalSearch onDark={onDark} inert={masthead} />
            </div>
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
        ── ROW TWO: THE MOBILE SEARCH ──────────────────────────────────────
        Full width, its own line, part of the header rather than floating
        under it — same component, same routing, same placeholder animation as
        the desktop field, just given room to be usable with a thumb.

        Hidden on the homepage masthead, where the hero's own large search sits
        a few hundred pixels below and two search boxes that close together is
        one too many. That is also why the homepage reserves no header
        clearance and cannot gain a gap from this row's absence.

        Its height is the 56px that headerClearance.ts adds to every mobile
        offset; the two numbers are the same fact and are commented as such.
      */}
      {!masthead && (
        <div
          className={[
            "flex h-14 items-center border-t px-4 md:hidden",
            scrolled ? "border-hairline bg-cream" : "border-transparent",
          ].join(" ")}
        >
          <GlobalSearch onDark={onDark} size="inline" />
        </div>
      )}

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

      {/*
        ── MOBILE DRAWER: PRIMARY NAVIGATION, AND NOTHING ELSE ─────────────
        The five section links, in the same order the desktop bar uses. That
        is the whole menu.

        It used to also carry the guest CTA, Share a Project, Share a Product,
        Dashboard, Notifications, View Profile, Edit Profile, Promote, Files,
        Account Settings and Sign Out — a second, longer copy of controls that
        are already in the header beside it. The bell, the Create button and
        the avatar menu are all still there on mobile and all still work, so
        every one of those destinations remained one tap away; the drawer was
        duplicating them, and "Promote" was a dead entry that only ever
        rendered the words "Coming soon".

        Nothing is lost by removing them, and the burger now answers exactly
        one question: where else can I go?
      */}
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
          </ul>
        </div>
      )}
    </header>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Menu, X } from "lucide-react";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { HeaderNotificationBell } from "@/components/home/HeaderNotificationBell";
import { HeaderProfileMenu } from "@/components/home/HeaderProfileMenu";
import { HomeNavCreateButton } from "@/components/home/HomeNavCreateButton";
import { usePublisherRole } from "@/lib/hooks/usePublisherRole";
import { ME_NAV, isWorkspaceRoute } from "@/components/me/MeWorkspaceNav";

/**
 * The persistent workspace shell: one sidebar and one top bar for the five
 * management destinations.
 *
 * ── WHY A SHELL AT ALL ──────────────────────────────────────────────────────
 * Every /me page rendered its own <HomeNav variant="solid" /> and its own page
 * padding. Five pages, five headers, five different content widths — and
 * navigating between them re-mounted the chrome each time, so the header
 * flickered on every click. The sidebar is the fix and the redesign at once:
 * the nav is mounted once by the layout and children scroll under it.
 *
 * ── IT DECIDES BY ROUTE, LIKE SiteShell ─────────────────────────────────────
 * Mounted from (app)/me/layout.tsx, which Next applies to ALL 13 /me routes.
 * Anything outside the workspace set is returned untouched, so /me/saved,
 * /me/files, /me/profile and the publish wizard render exactly as before. That
 * is the same contract SiteShell already uses for the public surface, rather
 * than a second competing idea of how routes are classified.
 *
 * ── AND SiteShell MUST ALSO STAND DOWN ──────────────────────────────────────
 * A page not listed in SiteShell's EDITORIAL_ROUTES gets TopNav plus
 * PageContainer's 1040px cap. /me/settings was in that state, so the five
 * workspace routes are added there too. Without it this sidebar would sit
 * inside a 1040px column underneath a second, unrelated header.
 */
export function MeWorkspaceShell({
  children,
  username,
}: {
  children: React.ReactNode;
  /** Powers the "View public profile" link; null before onboarding completes. */
  username: string | null;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Same gate the public header uses: the create affordance appears for
     publisher roles only, because a reader who clicks it reaches a wizard that
     refuses the submission. Before the early return — it is a hook. */
  const { canPublish } = usePublisherRole();

  if (!isWorkspaceRoute(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream font-body text-ink">
      {/* ── SIDEBAR ────────────────────────────────────────────────────────
          Fixed at lg and above; a slide-over below it. ONE <MeSidebar/>
          definition feeds both, so the drawer cannot drift from the rail. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col border-r border-hairline bg-cream lg:flex">
        <MeSidebar pathname={pathname} username={username} />
      </aside>

      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-hairline bg-cream lg:hidden">
            <MeSidebar
              pathname={pathname}
              username={username}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="lg:pl-[256px]">
        {/* ── TOP BAR ──────────────────────────────────────────────────────
            Search, notifications, create and the account menu are the
            platform's own components, not workspace copies of them.
            GlobalSearch is the same field the public header mounts — the
            workspace previously used the legacy zinc HeaderSearch, which was
            the last piece of the old palette on this bar.

            ── TWO ROWS BELOW md, ONE ABOVE ────────────────────────────────
            This bar is the mobile header on five signed-in routes, and it did
            not look like the one every other page shows: no wordmark, no
            create button, and — because the search was `hidden md:flex` with a
            spacer standing in for it — no search at all on a phone. It is the
            same two-row shape as HomeNav now: the bar, then a full-width
            search row that disappears at md, where the search returns to the
            centre of row one exactly as before.

            The wordmark and the burger are the chrome that stands in for the
            hidden sidebar, so both are `lg:hidden` and both leave at the width
            where the rail returns and supplies its own wordmark. Desktop is
            untouched: at lg this is the identical single 72px row it was. */}
        <header className="sticky top-0 z-30 border-b border-hairline bg-cream">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="shrink-0 font-display text-[22px] font-medium leading-none tracking-tight text-ink lg:hidden"
            >
              archtivy
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="rounded p-2 text-muted transition-colors hover:text-ink lg:hidden"
            >
              <Menu strokeWidth={1.5} className="h-5 w-5" />
            </button>

            <div className="hidden min-w-0 flex-1 justify-center md:flex">
              <div className="flex w-full max-w-[520px]">
                <GlobalSearch size="inline" />
              </div>
            </div>
            <div className="flex-1 md:hidden" />

            {/* Create sits before the bell and the account menu, which is
                where HomeNav puts it — same order, same spacing, same distance
                from the right edge, so this bar and the public one behave
                identically rather than diverging.

                KNOWN, MEASURED: below ~420px that shared panel is right-
                anchored to a trigger which is not the rightmost control, so it
                runs off the LEFT edge (28px clipped at 390, 41px at 375). The
                notification panel has the same defect at every phone width
                (50px), and that one predates this file — it measures identical
                before and after this change. Both live in the shared
                components, and fixing them alters the public header too. */}
            <div className="flex shrink-0 items-center gap-1">
              {canPublish && (
                <div className="lg:hidden">
                  <HomeNavCreateButton onDark={false} />
                </div>
              )}
              <HeaderNotificationBell onDark={false} />
              <HeaderProfileMenu onDark={false} />
            </div>
          </div>

          {/* Row two: the same GlobalSearch, full width, phones only. */}
          <div className="flex h-14 items-center border-t border-hairline px-4 sm:px-6 md:hidden">
            <GlobalSearch size="inline" />
          </div>
        </header>

        {/* No HEADER_CLEARANCE here, deliberately. Those constants exist for
            the fixed HomeNav, which is out of flow and so has to have its
            height reserved by every page under it. This bar is `sticky`: it
            occupies its own space, and growing it by a row pushes the content
            down on its own. `pt-6` is the content's top margin, not clearance
            for a header — importing a clearance token would double the gap on
            mobile by exactly the height of the new search row. */}
        <main className="px-4 pb-16 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function MeSidebar({
  pathname,
  username,
  onNavigate,
}: {
  pathname: string | null;
  username: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-hairline px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="font-display text-[22px] leading-none tracking-[-0.02em] text-ink"
        >
          archtivy
        </Link>
        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close navigation"
            className="rounded p-1.5 text-muted transition-colors hover:text-ink lg:hidden"
          >
            <X strokeWidth={1.5} className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {ME_NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-[14px] transition-colors",
                    active
                      ? "bg-stone/40 text-ink"
                      : "text-muted hover:bg-stone/20 hover:text-ink",
                  ].join(" ")}
                >
                  <Icon strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* The upgrade card. Points at the real promotion surface rather than a
          billing page that does not exist — Archtivy sells listing promotion,
          not a "Pro" subscription tier, so the CTA leads where money actually
          changes hands. See the note in /me/tools. */}
      <div className="shrink-0 px-3 pb-5">
        <div className="rounded-xl border border-hairline bg-stone/25 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream">
            <Crown strokeWidth={1.5} className="h-4 w-4 text-ink" aria-hidden />
          </span>
          <p className="mt-3 font-body text-[14px] font-medium text-ink">
            Grow your visibility
          </p>
          <p className="mt-1 font-body text-[12px] leading-[17px] text-muted">
            Feature your work across Archtivy to reach more architects and brands.
          </p>
          <Link
            href="/me/tools"
            onClick={onNavigate}
            className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-ink px-4 font-body text-[13px] text-cream transition-colors hover:bg-ink/90"
          >
            Promote a listing
          </Link>
        </div>
        {username && (
          <Link
            href={`/u/${encodeURIComponent(username)}`}
            onClick={onNavigate}
            className="mt-3 block px-1 font-body text-[12px] text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            View public profile →
          </Link>
        )}
      </div>
    </>
  );
}

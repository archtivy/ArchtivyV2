"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Menu, X } from "lucide-react";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { HeaderNotificationBell } from "@/components/home/HeaderNotificationBell";
import { HeaderProfileMenu } from "@/components/home/HeaderProfileMenu";
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
            Search, notifications and the account menu are the platform's own
            components, not workspace copies of them. GlobalSearch is the same
            field the public header mounts — the workspace previously used the
            legacy zinc HeaderSearch, which was the last piece of the old
            palette on this bar. */}
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-hairline bg-cream px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 rounded p-2 text-muted transition-colors hover:text-ink lg:hidden"
          >
            <Menu strokeWidth={1.5} className="h-5 w-5" />
          </button>

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <div className="flex w-full max-w-[520px]">
              <GlobalSearch size="inline" />
            </div>
          </div>
          <div className="flex-1 md:hidden" />

          <div className="flex shrink-0 items-center gap-1">
            <HeaderNotificationBell onDark={false} />
            <HeaderProfileMenu onDark={false} />
          </div>
        </header>

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

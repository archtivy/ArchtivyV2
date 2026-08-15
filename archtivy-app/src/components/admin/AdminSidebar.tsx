"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import { ADMIN_NAV_GROUPS } from "@/components/admin/nav";
import { LiveStatusIndicator } from "@/components/admin/LiveStatusIndicator";

/**
 * Admin sidebar.
 *
 * Chrome matched to HomeNav: cream ground, hairline rules, Inter, ink text —
 * so moving between the public site and the admin area doesn't feel like
 * changing products. The old version used a hardcoded `#002abf`, which is not
 * the platform accent (that is archtivy.primary, #173DED) and appeared nowhere
 * else on the site.
 *
 * The active item is a solid ink pill rather than a tinted accent background.
 * With grouped nav there are five headings competing for attention already;
 * one solid marker is easier to find than one tinted one.
 */

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-6">
      {ADMIN_NAV_GROUPS.map((group, gi) => (
        <div key={group.heading ?? `group-${gi}`}>
          {group.heading && (
            <div className="px-3 pb-2 font-body text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              {group.heading}
            </div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "block rounded-xl px-3 py-2 font-body text-[14px] transition-colors duration-150",
                      active
                        ? "bg-ink font-medium text-cream"
                        : "text-muted hover:bg-stone/40 hover:text-ink",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Wordmark() {
  return (
    <div className="leading-tight">
      <div className="font-body text-[15px] font-semibold tracking-[-0.01em] text-ink">
        Archtivy
      </div>
      <div className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
        Admin
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-[72px] shrink-0 items-center border-b border-hairline px-5">
        <Wordmark />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Admin sections">
        <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
      </nav>

      <div className="shrink-0 space-y-2 border-t border-hairline p-3">
        <LiveStatusIndicator />
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 font-body text-[14px] text-muted transition-colors duration-150 hover:bg-stone/40 hover:text-ink"
          onClick={() => setDrawerOpen(false)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to site
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: fixed rail */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-hairline bg-cream md:flex"
        aria-label="Admin navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile: top bar */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-[64px] items-center justify-between border-b border-hairline bg-cream px-4 md:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-xl p-2 text-ink transition-colors hover:bg-stone/40 focus:outline-none focus:ring-2 focus:ring-ink/20"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] md:hidden"
          aria-hidden
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-hairline bg-cream shadow-2xl",
          "transition-transform duration-200 ease-out md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        aria-hidden={!drawerOpen}
      >
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-hairline px-4">
          <Wordmark />
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-xl p-2 text-ink transition-colors hover:bg-stone/40 focus:outline-none focus:ring-2 focus:ring-ink/20"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Admin sections">
          <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
        </nav>
        <div className="shrink-0 border-t border-hairline p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 font-body text-[14px] text-muted transition-colors hover:bg-stone/40 hover:text-ink"
            onClick={() => setDrawerOpen(false)}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to site
          </Link>
        </div>
      </div>
    </>
  );
}

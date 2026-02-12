"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV } from "@/components/admin/nav";

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
    <ul className="space-y-1">
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={[
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#002abf]/10 text-[#002abf]"
                  : "text-zinc-700 hover:bg-zinc-200/80",
              ].join(" ")}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-14 items-center border-b border-zinc-200/80 px-4">
        <div className="leading-tight">
          <div className="text-sm font-semibold text-zinc-900">Archtivy</div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Admin
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <NavLinks pathname={pathname} />
      </nav>

      <div className="border-t border-zinc-200/80 p-3">
        <Link
          href="/"
          className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200/80"
          onClick={() => setDrawerOpen(false)}
        >
          Back to site
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-zinc-200/80 bg-white md:flex"
        aria-label="Admin navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile: top bar with hamburger */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200/80 bg-white px-4 md:hidden">
        <div className="leading-tight">
          <div className="text-sm font-semibold text-zinc-900">Archtivy</div>
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Admin
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
          aria-label="Open menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-900/20 md:hidden"
          aria-hidden
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200/80 bg-white shadow-xl transition-transform md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-label="Admin menu"
      >
        <div className="flex h-14 items-center justify-between border-b border-zinc-200/80 px-4">
          <span className="text-sm font-semibold text-zinc-900">Menu</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
            aria-label="Close menu"
          >
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
        </nav>
        <div className="border-t border-zinc-200/80 p-3">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200/80"
            onClick={() => setDrawerOpen(false)}
          >
            Back to site
          </Link>
        </div>
      </div>
    </>
  );
}

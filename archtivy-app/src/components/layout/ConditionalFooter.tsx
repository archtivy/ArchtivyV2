"use client";

import { usePathname } from "next/navigation";

/**
 * Where the global (zinc) Footer still renders.
 *
 * ── AN ALLOWLIST, NOT A BLOCKLIST ───────────────────────────────────────────
 * This used to name the routes that must NOT show the footer, and carried the
 * warning "Keep in sync with EDITORIAL_ROUTES in SiteShell, or a page gets two
 * footers." That is the wrong default: a new page got the global footer unless
 * someone remembered to exclude it, and a page that also drew its own ended up
 * with both.
 *
 * Every public page now renders SitePage, which draws HomeFooter when it wants
 * one. The only routes left without a footer of their own are Clerk's screens,
 * so those are the only ones named here — and a new page can no longer acquire
 * a second footer by forgetting to opt out of the first.
 */
const FOOTER_PREFIXES = ["/sign-in", "/sign-up"];

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const show =
    !!pathname &&
    FOOTER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return show ? <>{children}</> : null;
}

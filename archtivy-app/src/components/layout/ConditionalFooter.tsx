"use client";

import { usePathname } from "next/navigation";

/**
 * Exact routes where the global footer must not render.
 *   /explore   — tool-like fullscreen experience
 *   /          — renders its own editorial HomeFooter
 *   /projects  — same; the directory carries the cream palette
 * Without these exclusions those pages would end with two footers.
 * Keep in sync with EDITORIAL_ROUTES in SiteShell.
 */
const FOOTERLESS_ROUTES = new Set([
  "/explore",
  "/",
  "/projects",
  "/products",
  "/designers",
  "/brands",
  "/magazine",
  "/inspiration",
  // Mirrors EDITORIAL_ROUTES in SiteShell — these render their own HomeNav on
  // the cream palette. They are working surfaces rather than reading surfaces,
  // so they carry no footer at all (as /explore already does); the alternative
  // was the zinc global Footer under a cream page.
  "/me/dashboard",
  "/me/listings",
  "/me/profile",
  "/me/files",
]);

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (FOOTERLESS_ROUTES.has(pathname)) return null;
  // Mirrors the SiteShell rule: /projects/* and /products/* are shell-less by
  // default because only the server can tell a detail page from an archive.
  // The CategoryArchive components render the global Footer themselves.
  if (pathname?.startsWith("/projects/") || pathname?.startsWith("/products/")) return null;
  // Public profiles render their own HomeFooter — see the matching branch in
  // SiteShell. Without this the page would end in two footers. The /claim
  // children keep this one, exactly as SiteShell keeps their nav.
  if (pathname?.startsWith("/u/") && !pathname.endsWith("/claim")) return null;
  if (pathname?.startsWith("/magazine/")) return null;
  if (pathname?.startsWith("/inspiration/")) return null;
  return <>{children}</>;
}

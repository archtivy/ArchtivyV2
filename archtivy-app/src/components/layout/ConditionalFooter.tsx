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
]);

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (FOOTERLESS_ROUTES.has(pathname)) return null;
  // Mirrors the SiteShell rule: /projects/* and /products/* are shell-less by
  // default because only the server can tell a detail page from an archive.
  // The CategoryArchive components render the global Footer themselves.
  if (pathname?.startsWith("/projects/") || pathname?.startsWith("/products/")) return null;
  if (pathname?.startsWith("/magazine/")) return null;
  if (pathname?.startsWith("/inspiration/")) return null;
  return <>{children}</>;
}

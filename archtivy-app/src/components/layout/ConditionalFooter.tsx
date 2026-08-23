"use client";

import { usePathname } from "next/navigation";
import { isShellLess } from "@/lib/layout/shellRoutes";

/**
 * Suppresses the global (zinc) Footer on any page that supplies its own.
 *
 * Every shell-less route renders SitePage, which either draws HomeFooter on the
 * editorial tokens or deliberately ends without a footer — dashboards, the
 * wizards and /explore are working surfaces. Either way the global Footer must
 * not also render, or the page ends with two.
 *
 * The route list is shared with SiteShell rather than copied. /explore is the
 * one addition: it keeps the ExploreToolHeader shell rather than SitePage, so
 * it is not shell-less, but it is still footerless.
 */
const EXTRA_FOOTERLESS_ROUTES = new Set(["/explore"]);

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isShellLess(pathname)) return null;
  if (pathname && EXTRA_FOOTERLESS_ROUTES.has(pathname)) return null;
  return <>{children}</>;
}

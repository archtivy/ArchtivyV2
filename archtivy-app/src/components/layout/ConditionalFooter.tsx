"use client";

import { usePathname } from "next/navigation";

/** Exact routes where the footer must not render (tool-like fullscreen experiences). */
const FOOTERLESS_ROUTES = new Set(["/explore"]);

export function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (FOOTERLESS_ROUTES.has(pathname)) return null;
  return <>{children}</>;
}

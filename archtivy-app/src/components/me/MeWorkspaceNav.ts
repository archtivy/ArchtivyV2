import { LayoutDashboard, Package, MessageSquare, Megaphone, Settings } from "lucide-react";

/**
 * The five destinations of the signed-in management workspace.
 *
 * ── WHY A SHARED LIST AND NOT MARKUP IN THE SIDEBAR ─────────────────────────
 * The desktop rail and the mobile drawer both render this, and the layout uses
 * it to decide whether a given /me route gets the workspace shell at all. One
 * array, so a destination cannot exist in the sidebar but not in the shell —
 * which is exactly how a nav item ends up pointing at a page still drawing its
 * own header.
 */
export interface MeNavItem {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

export const ME_NAV: MeNavItem[] = [
  { href: "/me/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/me/listings", label: "Listings", Icon: Package },
  { href: "/me/messages", label: "Messages", Icon: MessageSquare },
  { href: "/me/tools", label: "Listing Tools", Icon: Megaphone },
  { href: "/me/settings", label: "Settings", Icon: Settings },
];

/**
 * Routes that render inside the workspace shell.
 *
 * ── SCOPED, NOT ALL OF /me ──────────────────────────────────────────────────
 * (app)/me holds 13 routes. Only the five management destinations belong in a
 * sidebar named after them; the rest are a different kind of page and are left
 * exactly as they are:
 *
 *   /me                  a redirect to the public profile
 *   /me/profile          the Edit Profile entry point
 *   /me/saved  /me/files /me/following  /me/notifications
 *                        personal library surfaces, each already restyled with
 *                        its own full-width HomeNav layout
 *   /me/listings/[id]    listing detail and the publish wizard, which own the
 *   /me/listings/[id]/edit  whole viewport by design — a management sidebar
 *                        beside a step-by-step wizard fights it for attention
 *
 * An exact-match set, deliberately: `startsWith` on "/me/listings" would drag
 * the wizard in through the back door.
 */
const SHELL_ROUTES = new Set<string>(ME_NAV.map((i) => i.href));

/**
 * Workspace children that keep the shell.
 *
 * The exact-match rule above is right for /me/listings, whose children are the
 * publish wizard. It is wrong for a message thread: /me/messages/[id] is the
 * same destination one level down, and without this it would fall through to
 * SiteShell's default and render inside PageContainer's 1040px cap under a
 * second header — the pair of symptoms /me/saved and /me/settings both had.
 *
 * Listed as an explicit prefix rather than a general startsWith, so adding a
 * route under /me/listings cannot pull the wizard in by accident.
 */
const SHELL_CHILD_PREFIXES = ["/me/messages/"];

export function isWorkspaceRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (SHELL_ROUTES.has(pathname)) return true;
  return SHELL_CHILD_PREFIXES.some((p) => pathname.startsWith(p));
}

/** The nav item a pathname activates, or null outside the workspace. */
export function activeNavHref(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const exact = ME_NAV.find((i) => i.href === pathname)?.href;
  if (exact) return exact;
  // A thread keeps Messages lit in the sidebar.
  return ME_NAV.find((i) => pathname.startsWith(`${i.href}/`))?.href ?? null;
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/**
 * Admin guard for App Router (RSC). Call from admin layout or pages.
 * - Unauthenticated → redirect to /sign-in
 * - Authenticated but not admin → redirect to /
 * Admin is determined from session claims only (no DB). Adjust conditions below if needed.
 */
export async function requireAdmin(): Promise<void> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Admin detection: session claims only. Can be adjusted later (e.g. add DB lookup).
  const publicMeta = sessionClaims?.publicMetadata as { isAdmin?: boolean } | undefined;
  const meta = sessionClaims?.metadata as { role?: string } | undefined;
  const isAdmin =
    publicMeta?.isAdmin === true || meta?.role === "admin";

  if (!isAdmin) {
    redirect("/");
  }
}

/**
 * Admin check for SERVER ACTIONS.
 *
 * requireAdmin() above redirects, which is right for a page render and wrong
 * inside an action: the caller wants an error it can show, not a navigation.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The (admin) layout calls requireAdmin(), so no non-admin can LOAD an admin
 * page. That says nothing about who can INVOKE the server actions those pages
 * import — a server action is an endpoint, reachable by anyone who can post to
 * it, and approveClaim/rejectClaim were checking only that a userId existed.
 * Any signed-in account could therefore approve a profile claim to itself.
 * The layout guard was doing all the work and could never have covered this.
 */
export async function isAdminUser(): Promise<boolean> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return false;
  const publicMeta = sessionClaims?.publicMetadata as { isAdmin?: boolean } | undefined;
  const meta = sessionClaims?.metadata as { role?: string } | undefined;
  return publicMeta?.isAdmin === true || meta?.role === "admin";
}

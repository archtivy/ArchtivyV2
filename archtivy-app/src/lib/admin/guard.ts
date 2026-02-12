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

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Call at the top of every admin API route.
 * Returns null when the caller is an admin, NextResponse otherwise.
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicMeta = sessionClaims?.publicMetadata as { isAdmin?: boolean } | undefined;
  const meta = sessionClaims?.metadata as { role?: string } | undefined;
  const isAdmin = publicMeta?.isAdmin === true || meta?.role === "admin";

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

import { NextResponse } from "next/server";

/**
 * Serves the IndexNow verification key as plain text.
 * IndexNow requires a publicly accessible key file; we use `keyLocation`
 * in our API submissions to point to this route.
 *
 * GET /api/indexnow-key → returns the INDEXNOW_KEY env var as text/plain.
 */
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse("IndexNow key not configured", { status: 404 });
  }
  return new NextResponse(key, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

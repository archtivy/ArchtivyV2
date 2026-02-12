/**
 * Clerk env check for edge/middleware (no process.env.NEXT_PUBLIC_ in edge by default
 * for some runtimes; Next.js injects them). Use simple check.
 */
export function isClerkConfiguredEdge(): boolean {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  if (!pk || !sk) return false;
  if (pk === "pk_test_xxxx" || pk === "pk_live_xxxx") return false;
  if (sk.startsWith("sk_xxxx")) return false;
  return true;
}

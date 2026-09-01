import { redirect } from "next/navigation";

/**
 * /me/promote → /me/tools.
 *
 * The promotion surface is called "Listing Tools" in the workspace sidebar and
 * lives at /me/tools. This route is kept as a permanent alias rather than
 * deleted: it is linked from the account menu in TopNavAuth, referenced in two
 * dashboard comments, and — most importantly — was the Stripe success/cancel
 * return URL for any checkout session created before this change. A session
 * already in flight must still land somewhere real when the user pays.
 *
 * The query string is preserved so ?success=true / ?cancelled=true reach the
 * new page and still render their banner.
 */
export default async function PromoteRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value[0] != null) qs.set(key, value[0]);
  }
  const suffix = qs.toString();
  redirect(suffix ? `/me/tools?${suffix}` : "/me/tools");
}

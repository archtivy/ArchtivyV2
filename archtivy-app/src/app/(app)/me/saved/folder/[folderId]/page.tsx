import { redirect } from "next/navigation";

/**
 * Legacy board route -> the board view inside the Saved workspace.
 *
 * This used to be a whole second saved page: its own header, its own filter
 * tabs, its own sort, and — the reason it cannot simply stay — the LEGACY
 * ProjectCard / ProductCard adapters rather than ListingCardShared. So the same
 * saved project looked like one card in a board and a different one everywhere
 * else on the platform.
 *
 * Opening a board now switches the main column inside /me/saved and keeps the
 * rail, the search and the filters, which is what the brief asks for. Keeping
 * both would leave two saved designs to drift apart — the near-duplicate split
 * this codebase has hit repeatedly.
 *
 * A redirect rather than a deletion: these links exist in the wild.
 *
 * dynamic is forced because a redirect from a statically prerendered route is
 * silently swallowed at build time — the same failure that made the earlier
 * /explore redirects no-ops until they moved into middleware. `auth()` would
 * make this dynamic anyway; the export makes it explicit rather than incidental.
 */
export const dynamic = "force-dynamic";

export default async function LegacySavedFolderPage({
  params,
  searchParams,
}: {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { folderId } = await params;
  const sp = await searchParams;

  // The old route's `q` and its `filter=projects|products` carry over; its
  // `sort=name` is the new `sort=title`. Anything else falls back to defaults.
  const qs = new URLSearchParams();
  qs.set("board", folderId);
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  if (q) qs.set("q", q);
  const filter = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  if (filter === "projects") qs.set("type", "project");
  if (filter === "products") qs.set("type", "product");
  const sort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  if (sort === "name") qs.set("sort", "title");

  redirect(`/me/saved?${qs.toString()}`);
}

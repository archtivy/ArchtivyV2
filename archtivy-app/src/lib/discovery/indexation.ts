/**
 * Indexation rule shared by the projects and products directories.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 * /projects, /products and their taxonomy archives are pages someone authored:
 * stable, editorially meaningful, indexable under the existing policy, and
 * canonical to themselves.
 *
 * Anything with a query on it — ?q=chair, ?materials=oak&brands=vola — is a
 * result set a visitor assembled. There is a combinatorial number of them,
 * they duplicate each other and the archive they were built from, and indexing
 * them would spread authority across thousands of near-identical URLs instead
 * of concentrating it on the taxonomy pages.
 *
 * So: any query at all makes the page `noindex, follow`. FOLLOW is the
 * load-bearing half — the listing links on a result page are the same
 * canonical detail URLs as everywhere else and should still be crawled. The
 * canonical tag continues to point at the clean archive path, so whatever
 * equity these URLs attract lands on the page that deserves it.
 *
 * Deliberately keyed on "is there any parameter", not on a list of which ones,
 * so a filter added later cannot quietly become indexable by being forgotten
 * in a whitelist.
 */

/** Params that describe HOW results are shown, not WHICH results they are. */
const DISPLAY_ONLY = new Set(["view"]);

export function isSearchResultUrl(
  sp: URLSearchParams | Record<string, string | string[] | undefined>
): boolean {
  const keys = sp instanceof URLSearchParams ? [...sp.keys()] : Object.keys(sp);
  return keys.some((k) => k.length > 0 && !DISPLAY_ONLY.has(k));
}

/** Build a URLSearchParams from Next's resolved searchParams object. */
export function toSearchParams(
  sp: Record<string, string | string[] | undefined>
): URLSearchParams {
  return new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]]
    )
  );
}

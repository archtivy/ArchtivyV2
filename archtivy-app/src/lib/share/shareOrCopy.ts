/**
 * Share a URL through the Web Share API, falling back to the clipboard.
 *
 * ── WHY THIS IS A MODULE ────────────────────────────────────────────────────
 * This exact sequence — try navigator.share, swallow the dismissal, copy
 * instead — was written inline in ProjectHeaderActions, and ShareProjectLinks
 * holds a clipboard-only variant of it. The lightbox needs the same behaviour,
 * and adding a third hand-rolled copy of a browser-capability dance is how the
 * near-duplicate divergence in this codebase keeps happening. One
 * implementation, one set of failure cases.
 *
 * Returns what actually happened so the caller can decide what to render:
 * a "Link copied" confirmation is a lie after a successful native share sheet,
 * and it is the only feedback available when the sheet does not exist.
 */
export type ShareOutcome = "shared" | "copied" | "dismissed" | "failed";

export async function shareOrCopy(input: {
  title: string;
  /** Absolute, canonical URL — never window.location, which may carry UI state. */
  url: string;
}): Promise<ShareOutcome> {
  const { title, url } = input;
  if (!url) return "failed";

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (err) {
      // AbortError is the user closing the sheet: an intentional cancel, not a
      // failure, and copying behind their back would be the wrong response.
      if (err instanceof DOMException && err.name === "AbortError") return "dismissed";
      // Any other rejection (permission, unsupported payload) falls through to
      // the clipboard rather than leaving the user with nothing.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}

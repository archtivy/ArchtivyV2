/**
 * The public surface's two button shapes, as tokens.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The newest public UI already agreed on a button; it just never wrote it
 * down. The same string is repeated verbatim in ProjectHeaderActions (Share),
 * RequestQuoteButton, ProductDetailView, FilterPrimitives, MagazineIndexView,
 * RequestProjectBand and the profile rail's Claim button:
 *
 *   rounded-full border border-ink/25 px-4 py-2 font-body text-[13px] text-ink
 *   transition-colors hover:bg-stone/50
 *
 * and the solid counterpart in SaveToggle's inline variant and
 * HomeNavCreateButton:
 *
 *   rounded-full px-4 font-body text-[13px] bg-ink text-cream
 *
 * Nothing here is new. Both constants are those strings, with py-2 written as
 * the h-9 it computes to so the pair is guaranteed to line up on a row.
 *
 * ── WHAT WAS WRONG WITHOUT IT ───────────────────────────────────────────────
 * ui/Button.tsx predates this language and still speaks the old one —
 * `archtivy-primary`, `zinc`, `dark:` variants, rounded-[20px]. FollowButton
 * and ProfileContactButton were written against that generation, so the two
 * most prominent actions on a profile were the only controls on the page not
 * drawn in the current system. That is the defect these tokens close.
 *
 * NOT converted here: the call sites listed above. They are byte-identical to
 * BTN_PILL_SECONDARY, so switching them is a pure no-op refactor — worth doing,
 * but not inside a change whose visual diff needs to stay readable.
 */

const BTN_PILL_BASE = [
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4",
  "font-body text-[13px] transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/** Solid ink on cream. One per row — the action the page wants you to take. */
export const BTN_PILL_PRIMARY = `${BTN_PILL_BASE} bg-ink text-cream hover:bg-ink/90`;

/** Hairline outline. Everything else. */
export const BTN_PILL_SECONDARY = `${BTN_PILL_BASE} border border-ink/25 text-ink hover:bg-stone/50`;

/**
 * Secondary, but visibly settled rather than offered — the "Following" state.
 * Muted text on the same outline, so it reads as a state and not as a second
 * call to action sitting beside the first.
 */
export const BTN_PILL_MUTED = `${BTN_PILL_BASE} border border-hairline text-muted hover:border-ink/25 hover:text-ink`;

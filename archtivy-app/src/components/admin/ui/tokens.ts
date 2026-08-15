/**
 * Admin design tokens.
 *
 * The admin area was built before the editorial palette existed and still used
 * raw zinc plus a hardcoded `#002abf` — which is not even the real accent
 * (tailwind.config.ts has archtivy.primary = #173DED). Both are replaced here.
 *
 * This is a MANAGEMENT surface, not an authoring one. It deliberately does not
 * adopt the wizard's one-action-per-screen card pattern: scanning and
 * bulk-approving many rows is what a table is for. What it takes from the
 * wizard is the *finish* — cream ground, hairline borders, generous vertical
 * rhythm, soft radii, pill status badges, Inter throughout.
 *
 * Import these rather than re-typing class strings, so a token change lands
 * everywhere at once.
 */

/** Page ground. Cream, matching the public site rather than the old grey. */
export const PAGE_BG = "bg-cream";

/** A raised surface on the cream ground. */
export const SURFACE = "rounded-2xl border border-hairline bg-white";

/** Hairline used for row separators — lighter than the card outline. */
export const ROW_DIVIDER = "border-hairline/60";

/** Type scale. Inter (font-body) everywhere; the serif display face is for
 *  the public site's editorial voice and would be wrong on a control panel. */
export const TYPE = {
  pageTitle: "font-body text-[26px] font-semibold tracking-[-0.02em] text-ink",
  pageSubtitle: "font-body text-[14px] text-muted",
  sectionTitle: "font-body text-[15px] font-semibold text-ink",
  /** Column headers. Small caps, wide tracking, never shouting. */
  columnHeader:
    "font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted",
  cellPrimary: "font-body text-[14px] font-medium text-ink",
  cellSecondary: "font-body text-[13px] text-muted",
  meta: "font-body text-[12px] text-muted",
} as const;

/** Form controls. One height (h-10) across the whole admin area. */
export const INPUT =
  "h-10 w-full rounded-xl border border-hairline bg-white px-3.5 font-body text-[14px] text-ink " +
  "placeholder:text-muted/70 outline-none transition-colors duration-150 " +
  "focus:border-archtivy-primary focus:ring-2 focus:ring-archtivy-primary/15";

export const SELECT = `${INPUT} pr-9 appearance-none cursor-pointer`;

/** Buttons. */
export const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 font-body " +
  "text-[14px] font-medium text-cream transition-all duration-150 hover:bg-ink/90 " +
  "focus:outline-none focus:ring-2 focus:ring-ink/20 focus:ring-offset-2 focus:ring-offset-cream " +
  "disabled:cursor-not-allowed disabled:opacity-40";

export const BTN_SECONDARY =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-white px-4 " +
  "font-body text-[14px] font-medium text-ink transition-all duration-150 hover:bg-stone/25 " +
  "focus:outline-none focus:ring-2 focus:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-40";

/** Destructive. Muted by default — it only turns loud on hover, so a delete
 *  control never dominates a row it merely sits in. */
export const BTN_DANGER =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 " +
  "font-body text-[14px] font-medium text-red-600 transition-all duration-150 " +
  "hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

/** Small inline action inside a table row. */
export const BTN_ROW =
  "inline-flex h-8 items-center rounded-lg px-2.5 font-body text-[13px] font-medium text-muted " +
  "transition-colors duration-150 hover:bg-stone/40 hover:text-ink focus:outline-none " +
  "focus:ring-2 focus:ring-ink/15 disabled:cursor-not-allowed disabled:opacity-40";

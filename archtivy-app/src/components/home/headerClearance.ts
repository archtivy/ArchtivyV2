/**
 * Top padding that clears the fixed HomeNav, in one place.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The header is `fixed`, so every surface under it reserves its own space with
 * a `pt-[…]`. That was fine while the bar was one height everywhere. It is not
 * fine now: on mobile the header carries a second row — the full-width search —
 * so it is taller on a phone than on a laptop, and a dozen hard-coded values
 * scattered across directories, detail pages, profiles and the wizard would
 * each have to remember that independently.
 *
 * They are constants here instead. The header's height and the clearance for it
 * are two halves of one fact, and this is the half the pages import.
 *
 * ── THE NUMBERS ─────────────────────────────────────────────────────────────
 * The bar itself is 72px. The mobile search row is 56px (h-14 plus its rule),
 * so every mobile value is its desktop value plus 56.
 *
 * The homepage is deliberately absent: its hero runs full-bleed underneath a
 * transparent bar and reserves nothing, which is also why hiding the mobile
 * search row on the masthead cannot leave a gap there.
 */

/** The mobile search row's height. Mobile clearance is desktop + this. */
export const MOBILE_SEARCH_ROW_PX = 56;

/**
 * The common case: directories, detail pages, profiles, magazine, inspiration
 * and the workspace pages — 92px of clearance on desktop.
 */
export const HEADER_CLEARANCE = "pt-[148px] md:pt-[92px]";

/** The publish wizard, which sits 104px down on desktop. */
export const HEADER_CLEARANCE_WIZARD = "pt-[160px] md:pt-[104px]";

/** Corporate pages, which clear the bar and nothing more. */
export const HEADER_CLEARANCE_TIGHT = "pt-[128px] md:pt-[72px]";

/** The homepage-adjacent hero band, 112px on desktop. */
export const HEADER_CLEARANCE_HERO = "pt-[168px] md:pt-[112px]";

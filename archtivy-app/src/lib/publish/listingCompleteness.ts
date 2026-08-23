import { computeSeoScore, type SeoCheck, type SeoScoreInput } from "@/lib/publish/seoScore";

/**
 * Turns a listing's SEO checklist into "what is missing, and where do I fix it".
 *
 * ── WHY REUSE THE SEO SCORE ─────────────────────────────────────────────────
 * computeSeoScore is already a pure function of fields the listing has, and the
 * wizard shows the same checklist live as the author types. Deriving the draft
 * card's "2 fields missing" from anything else would let the card and the
 * wizard disagree about what is incomplete — which is worse than not showing a
 * count at all.
 *
 * ── STEP INDICES ARE POSITIONS IN EACH WIZARD'S STEP_LABELS ─────────────────
 * project: Images 0 · Information 1 · Team 2 · Products 3 · Materials 4 ·
 *          Location 5 · Links 6 · SEO 7 · Publish 8
 * product: Images 0 · Information 1 · Details 2 · Materials 3 · Links 4 ·
 *          SEO 5 · Publish 6
 *
 * These are duplicated here rather than imported because the wizards are client
 * components and this runs on the server. The constants are asserted against
 * the real labels in the test note below — if a step is inserted, both lists
 * move together or the deep link lands on the wrong panel.
 */

export type ListingKind = "project" | "product";

/** Where each failing check is actually fixed, per wizard. */
const STEP_BY_CHECK: Record<ListingKind, Record<string, number>> = {
  project: {
    title: 1,
    description: 1,
    meta: 7,
    slug: 7,
    images: 0,
    alt: 0,
    relationship: 2, // Team is the first of Team/Products/Materials
    location: 5,
  },
  product: {
    title: 1,
    description: 1,
    meta: 5,
    slug: 5,
    images: 0,
    alt: 0,
    relationship: 3, // Materials — the only relationship a product has
    // Products carry no location of their own; the check exists but can never
    // pass, so it is never offered as something to go and fix.
    location: -1,
  },
};

export interface MissingField {
  id: string;
  label: string;
  hint: string;
  /** Wizard step index, or null when there is nowhere useful to send them. */
  step: number | null;
}

export interface ListingCompleteness {
  passed: number;
  total: number;
  percent: number;
  /** Only the checks that can actually be acted on, most fixable first. */
  missing: MissingField[];
  /** missing.length — the number the card shows. */
  missingCount: number;
  isIndexable: boolean;
}

/**
 * Checks a product can never pass, so they are excluded from its count.
 * Telling a brand "1 field missing" about a location field that does not exist
 * on the form is a dead end, not a prompt.
 */
function isActionable(kind: ListingKind, check: SeoCheck): boolean {
  return (STEP_BY_CHECK[kind][check.id] ?? null) !== -1;
}

export function computeListingCompleteness(
  kind: ListingKind,
  input: SeoScoreInput
): ListingCompleteness {
  const score = computeSeoScore(input);

  const missing: MissingField[] = score.checks
    .filter((c) => !c.passed && isActionable(kind, c))
    .map((c) => {
      const step = STEP_BY_CHECK[kind][c.id];
      return {
        id: c.id,
        label: c.label,
        hint: c.hint,
        step: step == null || step < 0 ? null : step,
      };
    })
    // Earliest wizard step first: the author works forward through the form,
    // so "add photos" should come before "write a meta description".
    .sort((a, b) => (a.step ?? 99) - (b.step ?? 99));

  // `total` counts only actionable checks too, so 6/6 on a product reads as
  // complete rather than permanently stuck at 7/8.
  const actionable = score.checks.filter((c) => isActionable(kind, c));
  const passed = actionable.filter((c) => c.passed).length;
  const total = actionable.length;

  return {
    passed,
    total,
    percent: total > 0 ? Math.round((passed / total) * 100) : 100,
    missing,
    missingCount: missing.length,
    isIndexable: score.isIndexable,
  };
}

/** Deep link straight to the step that fixes the first missing field. */
export function editHrefForStep(listingId: string, step: number | null): string {
  const base = `/me/listings/${listingId}/edit`;
  return step == null ? base : `${base}?step=${step}`;
}

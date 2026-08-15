/**
 * SEO readiness checklist (Build Brief §2, "SEO Score panel").
 *
 * A PURE FUNCTION of fields the listing already has. That is deliberate and is
 * the whole reason `listings` has no `is_indexable` column: the Collections
 * pattern stores the flag because a nightly job derives it from materialised
 * membership, but here the inputs live on the row itself, so a stored copy
 * could only go stale relative to its own source. Called live in the wizard as
 * the author types, and again at render time to decide `robots`.
 *
 * THRESHOLDS ARE PRODUCT-TUNABLE. The SEO Bible explicitly declines to fix the
 * numbers, so the proposed defaults live here as named constants — one place to
 * change when the real figures land, not scattered through the UI.
 */

export const SEO_THRESHOLDS = {
  /** Content Quality Gate — thin galleries should not index. */
  minImages: 5,
  /** Content Quality Gate — no name-only listings in the index. */
  minDescriptionWords: 150,
  /** SERP truncation band. Outside it the description is not "unique and useful". */
  metaDescriptionMin: 120,
  metaDescriptionMax: 160,
  /** Below this share of passing checks, ship noindex. */
  passRatioToIndex: 1,
} as const;

export interface SeoCheck {
  id: string;
  label: string;
  /** Shown when the check fails — says what to do, never just "invalid". */
  hint: string;
  passed: boolean;
  /** A failing check that still allows publishing. All are, today. */
  blocking: false;
}

export interface SeoScoreInput {
  title: string;
  metaDescription: string;
  slug: string;
  description: string;
  imageCount: number;
  /** Images that have real alt text (not a filename). */
  imagesWithAlt: number;
  teamCount: number;
  productCount: number;
  materialCount: number;
  city: string;
  country: string;
}

export interface SeoScore {
  checks: SeoCheck[];
  passed: number;
  total: number;
  /** 0–100, for the ring. */
  percent: number;
  /** Derived, never stored. Drives `robots` on the public page. */
  isIndexable: boolean;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** A generic title is one that would be identical across many listings. */
function isGenericTitle(title: string): boolean {
  const t = title.trim().toLowerCase();
  if (t.length < 3) return true;
  return ["untitled", "project", "new project", "test", "draft"].includes(t);
}

export function computeSeoScore(input: SeoScoreInput): SeoScore {
  const words = countWords(input.description);
  const metaLen = input.metaDescription.trim().length;

  const checks: SeoCheck[] = [
    {
      id: "title",
      label: "Title is present and specific",
      hint: "Give the project a real name — “Project” or “Untitled” reads as a placeholder to search engines.",
      passed: input.title.trim().length >= 3 && !isGenericTitle(input.title),
      blocking: false,
    },
    {
      id: "meta",
      label: `Meta description is ${SEO_THRESHOLDS.metaDescriptionMin}–${SEO_THRESHOLDS.metaDescriptionMax} characters`,
      hint:
        metaLen === 0
          ? "Write a one-sentence summary. This is the text shown under your link in search results."
          : metaLen < SEO_THRESHOLDS.metaDescriptionMin
            ? `A little longer — ${SEO_THRESHOLDS.metaDescriptionMin - metaLen} more characters.`
            : `A little shorter — ${metaLen - SEO_THRESHOLDS.metaDescriptionMax} over.`,
      passed:
        metaLen >= SEO_THRESHOLDS.metaDescriptionMin && metaLen <= SEO_THRESHOLDS.metaDescriptionMax,
      blocking: false,
    },
    {
      id: "slug",
      label: "URL is clean and readable",
      hint: "Use lowercase words separated by hyphens.",
      passed: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug.trim()) && input.slug.trim().length >= 3,
      blocking: false,
    },
    {
      id: "images",
      label: `At least ${SEO_THRESHOLDS.minImages} images`,
      hint: `Add ${Math.max(0, SEO_THRESHOLDS.minImages - input.imageCount)} more — thin galleries don’t earn a place in search results.`,
      passed: input.imageCount >= SEO_THRESHOLDS.minImages,
      blocking: false,
    },
    {
      id: "alt",
      label: "Cover image has descriptive alt text",
      hint: "Describe what the first image shows. A filename doesn’t count.",
      passed: input.imagesWithAlt >= 1,
      blocking: false,
    },
    {
      id: "description",
      label: `Description is at least ${SEO_THRESHOLDS.minDescriptionWords} words`,
      hint: `${words} so far — ${Math.max(0, SEO_THRESHOLDS.minDescriptionWords - words)} to go.`,
      passed: words >= SEO_THRESHOLDS.minDescriptionWords,
      blocking: false,
    },
    {
      id: "relationship",
      label: "At least one team member, product or material",
      hint: "Connections are what make a project discoverable from other pages.",
      passed: input.teamCount + input.productCount + input.materialCount > 0,
      blocking: false,
    },
    {
      id: "location",
      label: "Location is set",
      hint: "City and country strengthen the structured data and local search.",
      passed: input.city.trim().length > 0 && input.country.trim().length > 0,
      blocking: false,
    },
  ];

  const passed = checks.filter((c) => c.passed).length;
  const total = checks.length;

  return {
    checks,
    passed,
    total,
    percent: Math.round((passed / total) * 100),
    // Every check must pass to index. Deliberately strict: the SEO Bible treats
    // a thin page as a domain-level risk, not a per-page one, so the default
    // errs toward noindex. A listing below the bar still publishes and is fully
    // usable on-platform — it just does not enter the index.
    isIndexable: passed === total,
  };
}

import type { Candidate, ScoredListing } from "./types";

/**
 * Stops a well-ranked feed from becoming a boring one.
 *
 * ── WHY RANKING ALONE IS NOT ENOUGH ─────────────────────────────────────────
 * Score order is locally correct and globally awful. Someone who follows one
 * prolific studio and saves armchairs gets that studio's last nine projects
 * followed by six armchairs, every one of them a defensible recommendation and
 * the sequence as a whole useless. Diversity is applied AFTER scoring, as a
 * separate pass, so the ranking stays honest and the presentation stays
 * varied — rather than muddying the scores with anti-repetition terms that
 * would make "why was this recommended" unanswerable.
 *
 * ── A SLIDING WINDOW, NOT A GLOBAL QUOTA ────────────────────────────────────
 * The caps apply within a moving window rather than across the whole feed. A
 * global cap of two per studio would permanently exclude a studio's third
 * project; a window means it simply appears further down. Nothing is ever
 * removed for being repetitive — only deferred.
 */

const WINDOW = 8;

const CAPS = {
  /** Same designer/brand within a window. */
  owner: 2,
  /** Same top-level category within a window. */
  categoryRoot: 3,
  /** Same specific category (e.g. furniture/seating) within a window. */
  categoryPath: 2,
  /** Consecutive items of the same type before the other is preferred. */
  sameTypeRun: 3,
} as const;

/** Share of the feed held back for things outside the viewer's known taste. */
export const EXPLORATION_SHARE = 0.25;

function rootOf(path: string): string {
  return path.split("/")[0] ?? path;
}
function twoOf(path: string): string {
  return path.split("/").slice(0, 2).join("/");
}

interface Placeable {
  scored: ScoredListing;
  candidate: Candidate;
}

/**
 * Reorder so no short stretch is dominated by one studio, brand or category.
 *
 * Greedy: walk the ranked list and take the best item that does not breach a
 * cap given what is already placed; if everything breaches, take the best
 * anyway rather than dropping it. That last clause is what guarantees the feed
 * never shrinks because of its own rules.
 */
export function diversify(items: Placeable[]): Placeable[] {
  const remaining = [...items];
  const out: Placeable[] = [];

  while (remaining.length > 0) {
    const window = out.slice(-WINDOW);
    const ownerCount = new Map<string, number>();
    const rootCount = new Map<string, number>();
    const pathCount = new Map<string, number>();
    for (const w of window) {
      for (const o of w.candidate.creditProfileIds) ownerCount.set(o, (ownerCount.get(o) ?? 0) + 1);
      for (const p of w.candidate.taxonomyPaths) {
        rootCount.set(rootOf(p), (rootCount.get(rootOf(p)) ?? 0) + 1);
        pathCount.set(twoOf(p), (pathCount.get(twoOf(p)) ?? 0) + 1);
      }
    }

    // How many of the last few share one type, so projects and products mix.
    let run = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].candidate.type === out[out.length - 1].candidate.type) run++;
      else break;
    }
    const runType = out.length > 0 ? out[out.length - 1].candidate.type : null;

    let chosen = -1;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i].candidate;
      const ownerBreach = c.creditProfileIds.some((o) => (ownerCount.get(o) ?? 0) >= CAPS.owner);
      const rootBreach = c.taxonomyPaths.some((p) => (rootCount.get(rootOf(p)) ?? 0) >= CAPS.categoryRoot);
      const pathBreach = c.taxonomyPaths.some((p) => (pathCount.get(twoOf(p)) ?? 0) >= CAPS.categoryPath);
      const typeBreach = runType !== null && run >= CAPS.sameTypeRun && c.type === runType;
      if (!ownerBreach && !rootBreach && !pathBreach && !typeBreach) {
        chosen = i;
        break;
      }
    }

    // Nothing satisfies every cap — take the best remaining rather than stall.
    if (chosen === -1) chosen = 0;
    out.push(remaining.splice(chosen, 1)[0]);
  }

  return out;
}

/**
 * Fold exploratory items into a personalized list.
 *
 * ── WHY DISCOVERY IS INJECTED, NOT RANKED IN ────────────────────────────────
 * Anything outside the viewer's taste scores low by definition, so ranking
 * alone can never surface it — the feed would converge on what they already
 * like and stay there. A fixed share is therefore reserved and filled from
 * candidates the viewer's own signals did NOT select, spaced evenly so it
 * reads as variety rather than as a block of unrelated content at the end.
 *
 * These carry an `exploration` reason, so the feed's own diagnostics can tell
 * a deliberate detour from a ranking failure.
 */
export function injectExploration(
  personalized: Placeable[],
  explorationPool: Placeable[],
  targetTotal: number
): Placeable[] {
  const explorationSlots = Math.round(targetTotal * EXPLORATION_SHARE);
  if (explorationSlots <= 0 || explorationPool.length === 0) return personalized.slice(0, targetTotal);

  const picked = explorationPool.slice(0, explorationSlots).map((p) => ({
    ...p,
    scored: {
      ...p.scored,
      reasons: [
        ...p.scored.reasons,
        { kind: "exploration" as const, weight: 0, detail: "reserved discovery slot" },
      ],
    },
  }));

  const keep = personalized.slice(0, Math.max(0, targetTotal - picked.length));
  if (picked.length === 0) return keep;

  // Spread rather than append: one exploratory item every `gap` positions.
  const out: Placeable[] = [];
  const gap = Math.max(2, Math.floor((keep.length + picked.length) / picked.length));
  let e = 0;
  for (let i = 0; i < keep.length; i++) {
    out.push(keep[i]);
    if (e < picked.length && (i + 1) % gap === 0) out.push(picked[e++]);
  }
  while (e < picked.length) out.push(picked[e++]);
  return out.slice(0, targetTotal);
}

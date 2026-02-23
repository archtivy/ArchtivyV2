/**
 * Selection and presentation helpers for matches. Does not change generation or storage.
 */

import { MATCH_MIN_SCORE } from "./constants";

/** Minimum shape for match selection; items need at least a score. */
export interface MatchDisplayItem {
  score: number;
}

export interface SelectTopMatchesOptions {
  minScore?: number;
  limit: number;
}

/**
 * Filter matches by minScore (>=), sort by score DESC, take first `limit`.
 * Use for both project and product match display (lightbox and strip).
 */
export function selectTopMatches<T extends MatchDisplayItem>(
  matches: T[],
  options: SelectTopMatchesOptions
): T[] {
  const { minScore = MATCH_MIN_SCORE, limit } = options;
  return matches
    .filter((m) => Number(m.score) >= minScore)
    .sort((a, b) => (b.score as number) - (a.score as number))
    .slice(0, limit);
}

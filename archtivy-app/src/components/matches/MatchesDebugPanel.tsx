"use client";

export interface MatchesDebugPanelProps {
  rawMatchesCount: number;
  shownCount: number;
  minScore: number;
  limit: number;
  /** Top raw scores (e.g. first 5 by score desc) for preview */
  topRawScores: number[];
  /** When true, show "Matches exist but all are below minScore" below the panel */
  showBelowThresholdMessage?: boolean;
  className?: string;
}

export function MatchesDebugPanel({
  rawMatchesCount,
  shownCount,
  minScore,
  limit,
  topRawScores,
  showBelowThresholdMessage = false,
  className = "",
}: MatchesDebugPanelProps) {
  const scoresPreview = topRawScores.slice(0, 5).join(", ") || "—";

  return (
    <div className={className}>
      <div className="mb-2 rounded border border-amber-500/40 bg-amber-500/5 px-2 py-1.5 font-mono text-[10px] text-amber-800 dark:text-amber-200">
        <div>rawMatchesCount: {rawMatchesCount}</div>
        <div>shownCount: {shownCount}</div>
        <div>minScore: {minScore}</div>
        <div>limit: {limit}</div>
        <div>scores: {scoresPreview}</div>
      </div>
      {showBelowThresholdMessage && (
        <p className="mb-2 text-[10px] text-amber-700 dark:text-amber-300" aria-hidden>
          Matches exist but all are below minScore
        </p>
      )}
    </div>
  );
}

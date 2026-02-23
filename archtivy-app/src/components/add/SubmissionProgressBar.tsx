"use client";

export interface SubmissionProgressBarProps {
  /** 0–100 */
  percent: number;
  className?: string;
}

export function SubmissionProgressBar({ percent, className = "" }: SubmissionProgressBarProps) {
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 ${className}`.trim()}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Form completion"
    >
      <div
        className="h-full rounded-full bg-archtivy-primary transition-[width] duration-200 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

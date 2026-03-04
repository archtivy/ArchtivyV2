import { ExploreCardSkeleton } from "@/components/explore/ExploreCardSkeleton";

const SKELETON_COUNT = 6;

export default function Loading() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="h-32 animate-pulse bg-zinc-100 dark:bg-zinc-900 sm:h-40" aria-hidden />
      <div className="border-b border-zinc-200/80 pb-4 pt-4 dark:border-zinc-800/80">
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="space-y-4 pt-4">
        <div className="h-10 w-full max-w-md animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <li key={i}>
              <ExploreCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ExploreCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded border bg-white dark:bg-zinc-950"
      style={{ borderColor: "#f1f1f1" }}
    >
      <div className="aspect-[3/2] w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
      <div className="space-y-2 p-4 sm:p-5 lg:p-6">
        <div className="h-5 max-w-[90%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" style={{ width: "85%" }} />
        <div className="h-5 max-w-[70%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" style={{ width: "60%" }} />
        <div className="h-4 max-w-[45%] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" style={{ width: "40%" }} />
      </div>
    </div>
  );
}

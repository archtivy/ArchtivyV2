export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-10 w-96 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-32 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-zinc-800/50" />
    </div>
  );
}

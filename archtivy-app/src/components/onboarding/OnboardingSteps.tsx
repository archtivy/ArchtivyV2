/**
 * Minimal onboarding steps. Shown only to logged-in users with zero listings,
 * on add project/product pages and optionally on me/listings (dismissible).
 * Never shown on homepage, explore, or footer.
 */

export function OnboardingSteps() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Quick start
      </p>
      <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
        <li className="flex gap-2">
          <span className="font-semibold text-archtivy-primary">1.</span>
          Create a listing — add a title and description.
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-archtivy-primary">2.</span>
          Upload a gallery (at least 3 images).
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-archtivy-primary">3.</span>
          Link projects and products so they appear in context.
        </li>
      </ol>
    </div>
  );
}

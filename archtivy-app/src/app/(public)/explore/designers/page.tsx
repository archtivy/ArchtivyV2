import Link from "next/link";
import { getProfilesByRole } from "@/lib/db/profiles";

export default async function ExploreDesignersPage() {
  const { data: profiles } = await getProfilesByRole("designer");
  const designers = profiles ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
        Designers
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Browse designers and their projects.
      </p>
      {designers.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:text-zinc-400">
          No designers yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designers.map((p) => (
            <li key={p.id}>
              <Link
                href={`/u/${encodeURIComponent(p.username ?? "")}`}
                className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-archtivy-primary/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.display_name ?? p.username ?? "Designer"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

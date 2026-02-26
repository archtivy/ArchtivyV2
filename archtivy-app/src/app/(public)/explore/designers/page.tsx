export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProfilesByRoleCached } from "@/lib/db/profiles";
import { ProfileCard } from "@/components/explore/ProfileCard";

export default async function ExploreDesignersPage() {
  const { data: profiles } = await getProfilesByRoleCached("designer");
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
        <p
          className="rounded border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
          style={{ borderRadius: 4 }}
        >
          No designers yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {designers.map((p) => (
            <li key={p.id} className="flex">
              <ProfileCard profile={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { getProfilesByRole } from "@/lib/db/profiles";
import Image from "next/image";

export default async function ExploreBrandsPage() {
  const { data: profiles } = await getProfilesByRole("brand");
  const brands = profiles ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
        Brands
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Browse brands and their products.
      </p>
      {brands.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500 dark:text-zinc-400">
          No brands yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((p) => (
            <li key={p.id}>
              <Link
                href={`/u/${encodeURIComponent(p.username ?? "")}`}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-archtivy-primary/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                {p.avatar_url ? (
                  <Image
                    src={p.avatar_url}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium dark:bg-zinc-700">
                    {(p.display_name ?? p.username ?? "?")[0].toUpperCase()}
                  </span>
                )}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.display_name ?? p.username ?? "Brand"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

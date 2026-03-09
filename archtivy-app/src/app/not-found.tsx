import Link from "next/link";
import { getProjectsCanonicalFiltered } from "@/lib/db/explore";
import { getProductsCanonicalFiltered } from "@/lib/db/explore";
import { DEFAULT_PROJECT_FILTERS, DEFAULT_PRODUCT_FILTERS } from "@/lib/exploreFilters";
import { NotFoundSearch } from "@/components/not-found/NotFoundSearch";
import { NotFoundTrending } from "@/components/not-found/NotFoundTrending";

export default async function NotFound() {
  const [projectsResult, productsResult] = await Promise.all([
    getProjectsCanonicalFiltered({
      filters: DEFAULT_PROJECT_FILTERS,
      limit: 3,
      sort: "newest",
    }),
    getProductsCanonicalFiltered({
      filters: DEFAULT_PRODUCT_FILTERS,
      limit: 3,
      sort: "newest",
    }),
  ]);

  const trendingProjects = projectsResult.data;
  const trendingProducts = productsResult.data;

  return (
    <main className="min-h-[80vh] bg-white dark:bg-zinc-950">
      {/* Hero section */}
      <section className="mx-auto max-w-2xl px-6 pb-12 pt-24 text-center sm:pt-32">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          404
        </p>
        <h1 className="mt-4 font-serif text-3xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          This page could not be found.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          The page may have moved, but architecture is still happening across
          Archtivy.
        </p>

        {/* Search */}
        <div className="mt-10">
          <NotFoundSearch />
        </div>

        {/* Explore shortcuts */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/explore/projects"
            className="inline-flex items-center rounded border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:border-[#002abf] hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-[#5b7cff] dark:hover:text-[#5b7cff]"
          >
            Explore Projects
          </Link>
          <Link
            href="/explore/products"
            className="inline-flex items-center rounded border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:border-[#002abf] hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-[#5b7cff] dark:hover:text-[#5b7cff]"
          >
            Explore Products
          </Link>
        </div>
      </section>

      {/* Trending section */}
      {(trendingProjects.length > 0 || trendingProducts.length > 0) && (
        <section className="border-t border-zinc-100 bg-[#fafafa] py-16 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
              Trending on Archtivy
            </p>
            <NotFoundTrending
              projects={trendingProjects}
              products={trendingProducts}
            />
          </div>
        </section>
      )}
    </main>
  );
}

import Link from "next/link";
import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";
import { HomeHeroSearch } from "@/components/search/HomeHeroSearch";
import { ShareWorkTrigger } from "@/components/ShareWorkTrigger";

const FEATURED_PROJECTS_LIMIT = 6;
const FEATURED_PRODUCTS_LIMIT = 8;

export default async function Home() {
  const [projects, products] = await Promise.all([
    getProjectsCanonical(FEATURED_PROJECTS_LIMIT),
    getProductsCanonical(FEATURED_PRODUCTS_LIMIT),
  ]);

  return (
    <div className="space-y-16 pb-24 sm:space-y-20 sm:pb-28">
      {/* Hero */}
      <section className="text-center">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Architecture, intelligently connected.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
          Discover how projects, products, and professionals connect across cities.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <HomeHeroSearch />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explore/projects"
              className="inline-block rounded-[20px] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
              style={{ backgroundColor: "#002abf" }}
            >
              Explore the Network
            </Link>
            <ShareWorkTrigger className="inline-block rounded-[20px] border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950">
              Share your work
            </ShareWorkTrigger>
          </div>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Featured Projects
          </h2>
          <Link
            href="/explore/projects"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eaeaea] bg-[#f6f6f6] px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200/80 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            View all →
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            No projects yet.{" "}
            <Link
              href="/add/project"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary dark:hover:opacity-90"
            >
              Add the first project
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Featured projects">
            {projects.map((p) => (
              <li key={p.id} className="h-full">
                <ProjectCardPremium project={p} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Featured Products */}
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
            Featured Products
          </h2>
          <Link
            href="/explore/products"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#eaeaea] bg-[#f6f6f6] px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200/80 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            View all →
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
            No products yet.{" "}
            <Link
              href="/add/product"
              className="text-archtivy-primary hover:underline dark:text-archtivy-primary dark:hover:opacity-90"
            >
              Add the first product
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Featured products">
            {products.map((p) => (
              <li key={p.id} className="h-full">
                <ProductCardPremium product={p} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

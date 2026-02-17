import Link from "next/link";
import { getProjectsCanonical, getProductsCanonical } from "@/lib/db/explore";
import { getListingUrl } from "@/lib/canonical";
import { projectCanonicalToCardData, productCanonicalToCardData } from "@/lib/canonical-models";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { ProductCard } from "@/components/listing/ProductCard";
import { HomeHeroSearch } from "@/components/search/HomeHeroSearch";

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
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Projects, products & credits for architecture
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500 dark:text-zinc-400">
          Archtivy connects built projects with the products and people behind
          them. Explore work, link products to projects, and surface what
          matters.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <HomeHeroSearch />
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button as="link" href="/explore/projects" variant="primary">
              Explore Projects
            </Button>
            <Button as="link" href="/explore/products" variant="secondary">
              Explore Products
            </Button>
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
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Featured projects">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectCard
                  listing={projectCanonicalToCardData(p)}
                  imageUrl={p.cover}
                  href={getListingUrl({ id: p.id, type: "project" })}
                  postedBy={p.owner?.displayName ?? undefined}
                  location={p.location_text}
                  areaSqft={p.area_sqft}
                />
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
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Featured products">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard
                  listing={productCanonicalToCardData(p)}
                  imageUrl={p.cover}
                  href={getListingUrl({ id: p.id, type: "product" })}
                  postedBy={p.owner?.displayName ?? undefined}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

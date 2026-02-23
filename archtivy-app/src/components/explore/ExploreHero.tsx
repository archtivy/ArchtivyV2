import Link from "next/link";

export type ExploreHeroType = "projects" | "products";

export interface ExploreHeroProps {
  type: ExploreHeroType;
}

export function ExploreHero({ type }: ExploreHeroProps) {
  const secondaryLabel = type === "projects" ? "View Projects" : "View Products";
  const path = type === "projects" ? "/explore/projects" : "/explore/products";

  return (
    <section className="bg-white py-12 sm:py-16 md:py-20 lg:min-h-[80px]" aria-label="Hero">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h1 className="font-serif text-3xl font-normal tracking-tight text-zinc-900 sm:text-4xl md:text-5xl dark:text-zinc-100">
          Architecture, intelligently connected.
        </h1>
        <p className="mt-4 text-lg text-zinc-600 sm:mt-5 sm:text-xl dark:text-zinc-400">
          Discover how projects, products, and professionals connect across cities.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:mt-10">
          <Link
            href="/explore"
            className="inline-block rounded-[20px] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
            style={{ backgroundColor: "#002abf" }}
          >
            Explore the Network
          </Link>
          <Link
            href={path}
            className="inline-block rounded-[20px] border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-archtivy-primary focus:ring-offset-2 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

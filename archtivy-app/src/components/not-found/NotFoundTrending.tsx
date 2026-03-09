"use client";

import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";

interface NotFoundTrendingProps {
  projects: ProjectCanonical[];
  products: ProductCanonical[];
}

export function NotFoundTrending({ projects, products }: NotFoundTrendingProps) {
  return (
    <div className="mt-10 space-y-12">
      {/* Trending projects */}
      {projects.length > 0 && (
        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            Projects
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCardPremium key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Trending products */}
      {products.length > 0 && (
        <div>
          <h3 className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-zinc-400">
            Products
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCardPremium key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

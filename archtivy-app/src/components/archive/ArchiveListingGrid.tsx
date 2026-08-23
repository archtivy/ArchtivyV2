"use client";

import type { ProjectCanonical, ProductCanonical } from "@/lib/canonical-models";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { ProductCardPremium } from "@/components/listing/ProductCardPremium";

interface ProjectGridProps {
  type: "project";
  items: ProjectCanonical[];
}

interface ProductGridProps {
  type: "product";
  items: ProductCanonical[];
}

type ArchiveListingGridProps = ProjectGridProps | ProductGridProps;

/**
 * Responsive listing grid for archive pages.
 * Projects: 3 cols on desktop, Products: 4 cols on desktop.
 */
export function ArchiveListingGrid(props: ArchiveListingGridProps) {
  if (props.type === "project") {
    if (props.items.length === 0) return <ArchiveEmpty />;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {props.items.map((project) => (
          <ProjectCardPremium key={project.id} project={project} />
        ))}
      </div>
    );
  }

  if (props.items.length === 0) return <ArchiveEmpty />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {props.items.map((product) => (
        <ProductCardPremium key={product.id} product={product} />
      ))}
    </div>
  );
}

function ArchiveEmpty() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted">No listings in this category yet.</p>
      <p className="mt-2 text-xs text-muted">
        Try browsing a parent category or use the subcategory links above.
      </p>
    </div>
  );
}

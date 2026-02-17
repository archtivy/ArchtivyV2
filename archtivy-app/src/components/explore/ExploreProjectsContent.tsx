"use client";

import { useState, useTransition } from "react";
import { getListingUrl } from "@/lib/canonical";
import { projectCanonicalToCardData } from "@/lib/canonical-models";
import { ProjectCard } from "@/components/listing/ProjectCard";
import { Button } from "@/components/ui/Button";
import { fetchProjectsPage } from "@/app/actions/explore";
import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ProjectFilters } from "@/lib/exploreFilters";
import type { ProjectSortOption } from "@/lib/exploreFilters";

export interface ExploreProjectsContentProps {
  initialData: ProjectCanonical[];
  initialTotal: number;
  filters: ProjectFilters;
  sort: ProjectSortOption;
  children?: React.ReactNode;
}

export function ExploreProjectsContent({
  initialData,
  initialTotal,
  filters,
  sort,
  children,
}: ExploreProjectsContentProps) {
  const [projects, setProjects] = useState<ProjectCanonical[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [isPending, startTransition] = useTransition();

  const hasMore = projects.length < total;
  const loadMore = () => {
    startTransition(async () => {
      const { data: nextData, total: nextTotal } = await fetchProjectsPage({
        filters,
        offset: projects.length,
        sort,
      });
      setProjects((prev) => [...prev, ...nextData]);
      setTotal(nextTotal);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {children}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Projects">
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
      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

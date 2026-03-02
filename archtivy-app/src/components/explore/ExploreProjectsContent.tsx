"use client";

import { useState, useTransition } from "react";
import { ProjectCardPremium } from "@/components/listing/ProjectCardPremium";
import { Button } from "@/components/ui/Button";
import { fetchProjectsPage } from "@/app/actions/explore";
import { RelatedProfilesStrip } from "@/components/explore/RelatedProfilesStrip";
import type { RelatedProfilesStripItem } from "@/components/explore/RelatedProfilesStrip";
import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ProjectFilters } from "@/lib/exploreFilters";
import type { ProjectSortOption } from "@/lib/exploreFilters";

// Insert strip after the 6th card (index 5) = after 2 rows of 3 on desktop
const STRIP_INSERT_AFTER = 5;

export interface ExploreProjectsContentProps {
  initialData: ProjectCanonical[];
  initialTotal: number;
  filters: ProjectFilters;
  sort: ProjectSortOption;
  stripItems?: RelatedProfilesStripItem[];
  children?: React.ReactNode;
}

export function ExploreProjectsContent({
  initialData,
  initialTotal,
  filters,
  sort,
  stripItems,
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

  const showStrip = Array.isArray(stripItems) && stripItems.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {children}
      <ul
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        aria-label="Projects"
      >
        {projects.flatMap((p, i) => {
          const card = (
            <li key={p.id} className="h-full">
              <ProjectCardPremium project={p} />
            </li>
          );

          if (i === STRIP_INSERT_AFTER && showStrip) {
            return [
              card,
              <li key="__designers-strip__" className="col-span-full my-1">
                {/* TODO: enrich with real logoUrl + locationText when profile API is wired */}
                <RelatedProfilesStrip
                  title="Designers & Studios"
                  variant="with-location"
                  items={stripItems}
                />
              </li>,
            ];
          }

          return [card];
        })}
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

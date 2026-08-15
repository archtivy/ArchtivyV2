import { EntityCard } from "@/components/home/EntityCard";
import { HomeSectionHeader } from "@/components/home/HomeSectionHeader";
import { getListingUrl } from "@/lib/canonical";
import type { ProjectCanonical } from "@/lib/canonical-models";

/**
 * Featured Projects (Build Brief §4, left column) — 4-across grid.
 *
 * Takes projects as a prop rather than fetching, so the homepage makes one
 * getProjectsCanonical() call shared with the Projects Showcase below instead
 * of two round trips for overlapping data.
 */
export function FeaturedProjects({ projects }: { projects: ProjectCanonical[] }) {
  if (projects.length === 0) return null;

  return (
    <div>
      <HomeSectionHeader
        title="Featured Projects"
        href="/projects"
        linkLabel="View all projects"
      />
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
        {projects.map((p, i) => (
          <EntityCard
            key={p.id}
            href={getListingUrl({
              id: p.id,
              slug: p.slug,
              type: "project",
              taxonomySlugPath: p.taxonomy_slug_path ?? null,
            })}
            title={p.title}
            location={p.location_text}
            subtitle={p.owner?.displayName ?? null}
            imageUrl={p.cover}
            priority={i === 0}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 45vw, 20vw"
          />
        ))}
      </div>
    </div>
  );
}

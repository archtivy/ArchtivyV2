import type { ProjectCanonical } from "@/lib/canonical-models";
import { ListingCardShared } from "@/components/listing/ListingCardShared";
import { projectToCardModel, type CardCounts } from "@/lib/cards/toListingCardModel";

/**
 * Project card for surfaces holding normalised ProjectCanonical data —
 * explore, archive grids, the network feed, the 404 trending rail.
 *
 * Now a thin adapter over ListingCardShared. It keeps its name and its prop so
 * the call sites did not all have to change in one commit, but it no longer
 * owns any layout: everything visual lives in the shared card, and the mapping
 * lives in projectToCardModel.
 *
 * `counts` is optional and arrives from the page, which calls
 * getCardBadgeCounts once for the whole grid. A surface that has not wired them
 * up renders without the badge rather than querying per card.
 */
export interface ProjectCardPremiumProps {
  project: ProjectCanonical;
  counts?: CardCounts;
  priority?: boolean;
  initialSaved?: boolean;
}

export function ProjectCardPremium({
  project,
  counts,
  priority = false,
  initialSaved = false,
}: ProjectCardPremiumProps) {
  return (
    <ListingCardShared
      model={projectToCardModel(project, counts, initialSaved)}
      priority={priority}
    />
  );
}

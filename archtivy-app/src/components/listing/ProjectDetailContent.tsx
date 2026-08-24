import type { ProjectCanonical } from "@/lib/canonical-models";
import type { ListingTeamMemberWithProfile } from "@/lib/db/listingTeamMembers";

/** Minimal document shape for display (listing_documents or canonical). */
export interface ProjectDocumentItem {
  id: string;
  file_url: string;
  file_name: string;
}

export interface UsedProductItem {
  id: string;
  slug: string;
  title: string;
  brand?: string | null;
  thumbnail?: string | null;
  taxonomy_slug_path?: string | null;
  /**
   * Which relationship this is: 'manual' = the author listed it as used in the
   * build, 'photo_tag' = it is pinned to a spot in one of the photos. Optional
   * so existing callers keep compiling; absent reads as 'manual'.
   */
  linkSource?: "manual" | "photo_tag";
}

export interface ProjectDetailContentProps {
  project: ProjectCanonical;
  usedProducts?: UsedProductItem[];
  teamWithProfiles?: ListingTeamMemberWithProfile[] | null;
  documents?: ProjectDocumentItem[];
}

function DescriptionSection({ text }: { text: string }) {
  return (
    <section className="mb-12" aria-label="Description">
      <div
        className="max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[#374151] dark:text-zinc-400"
        style={{ lineHeight: 1.7 }}
      >
        {text}
      </div>
    </section>
  );
}

/** Left column: description only. Team, used products, materials live in NetworkSidebar. */
export function ProjectDetailContent({
  project,
}: ProjectDetailContentProps) {
  const description = project.description?.trim();

  return (
    <div className="space-y-0">
      {description && <DescriptionSection text={description} />}
    </div>
  );
}

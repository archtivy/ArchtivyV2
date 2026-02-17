import Image from "next/image";
import Link from "next/link";
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
}

export interface ProjectDetailContentProps {
  project: ProjectCanonical;
  usedProducts: UsedProductItem[];
  teamWithProfiles: ListingTeamMemberWithProfile[] | null;
  documents: ProjectDocumentItem[];
}

function DescriptionSection({ text }: { text: string }) {
  return (
    <section className="mb-12" aria-labelledby="project-description-heading">
      <h2
        id="project-description-heading"
        className="mb-4 font-serif text-xl font-normal text-[#111827] dark:text-zinc-100"
      >
        Description
      </h2>
      <div
        className="max-w-[65ch] whitespace-pre-wrap text-[15px] leading-relaxed text-[#374151] dark:text-zinc-400"
        style={{ lineHeight: 1.7 }}
      >
        {text}
      </div>
    </section>
  );
}

function UsedInProjectSection({ items }: { items: UsedProductItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-12" aria-labelledby="used-in-project-heading">
      <h2
        id="used-in-project-heading"
        className="mb-4 font-serif text-xl font-normal text-[#111827] dark:text-zinc-100"
      >
        Used in this project
      </h2>
      <div className="flex gap-6 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/products/${item.slug}`}
            className="group flex shrink-0 flex-col focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 rounded-lg"
          >
            <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt=""
                  fill
                  className="object-cover transition-opacity group-hover:opacity-90"
                  sizes="96px"
                  unoptimized={String(item.thumbnail).startsWith("http")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500 text-xs">
                  —
                </div>
              )}
            </div>
            <span className="mt-2 max-w-[120px] truncate text-sm font-medium text-[#111827] dark:text-zinc-100 group-hover:text-[#002abf] dark:group-hover:text-[#002abf]">
              {item.title}
            </span>
            {item.brand?.trim() && (
              <span className="mt-0.5 text-xs text-[#374151] dark:text-zinc-400">{item.brand.trim()}</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Left column only: description + used in this project. Team, materials, documents live in sidebar. */
export function ProjectDetailContent({
  project,
  usedProducts,
}: ProjectDetailContentProps) {
  const description = project.description?.trim();

  return (
    <div className="space-y-0">
      {description && <DescriptionSection text={description} />}
      <UsedInProjectSection items={usedProducts} />
    </div>
  );
}

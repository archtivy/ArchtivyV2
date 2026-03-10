import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { listingCardSelect } from "@/lib/db/selects";
import {
  detectProjectOpportunities,
  detectProductOpportunities,
  isOpportunity,
  PROJECT_STATUS_LABELS,
  PRODUCT_STAGE_LABELS,
  PROJECT_COLLAB_LABELS,
  PRODUCT_COLLAB_LABELS,
  OPPORTUNITY_TYPE_BADGE_CLASS,
  type ProjectStatus,
  type ProductStage,
  type ProjectCollaborationStatus,
  type ProductCollaborationStatus,
} from "@/lib/lifecycle";
import { getListingUrl } from "@/lib/canonical";
import { Container } from "@/components/layout/Container";
import Link from "next/link";
import Image from "next/image";

export const revalidate = 300; // 5 min ISR

export const metadata = {
  title: "Opportunities | Archtivy",
  description:
    "Discover industry opportunities — concept projects, prototypes, designs seeking manufacturers, and collaboration openings.",
};

interface OpportunityListing {
  id: string;
  type: "project" | "product";
  title: string;
  slug: string;
  cover_image_url: string | null;
  location: string | null;
  year: string | null;
  project_status: string | null;
  product_stage: string | null;
  project_collaboration_status: string | null;
  product_collaboration_status: string | null;
  project_looking_for: string[] | null;
  product_looking_for: string[] | null;
  created_at: string;
}

async function getOpportunities(): Promise<OpportunityListing[]> {
  const sup = getSupabaseServiceClient();
  const { data } = await sup
    .from("listings")
    .select(
      "id, type, title, slug, cover_image_url, location, year, project_status, product_stage, project_collaboration_status, product_collaboration_status, project_looking_for, product_looking_for, created_at"
    )
    .eq("status", "APPROVED")
    .is("deleted_at", null)
    .or(
      [
        "project_status.in.(concept,design_development,under_construction)",
        "product_stage.in.(concept,in_development,prototype)",
        "project_collaboration_status.in.(open_for_collaboration,seeking_partners,seeking_suppliers,seeking_brands)",
        "product_collaboration_status.in.(seeking_manufacturer,open_to_manufacturing_partnership,open_to_licensing,seeking_brand_partner)",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(60);

  return ((data ?? []) as OpportunityListing[]).filter(isOpportunity);
}

function OpportunityBadge({ label, type }: { label: string; type: string }) {
  const cls =
    OPPORTUNITY_TYPE_BADGE_CLASS[type] ??
    OPPORTUNITY_TYPE_BADGE_CLASS.industry_signal;
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function OpportunityCard({ listing }: { listing: OpportunityListing }) {
  const opportunities =
    listing.type === "project"
      ? detectProjectOpportunities(
          listing.project_status,
          listing.project_collaboration_status
        )
      : detectProductOpportunities(
          listing.product_stage,
          listing.product_collaboration_status
        );

  if (opportunities.length === 0) return null;

  const primary = opportunities[0];
  const href = getListingUrl({ id: listing.id, type: listing.type, slug: listing.slug });

  const stageLine =
    listing.type === "project" && listing.project_status
      ? PROJECT_STATUS_LABELS[listing.project_status as ProjectStatus]
      : listing.type === "product" && listing.product_stage
        ? PRODUCT_STAGE_LABELS[listing.product_stage as ProductStage]
        : null;

  const collabLine =
    listing.type === "project" && listing.project_collaboration_status
      ? PROJECT_COLLAB_LABELS[listing.project_collaboration_status as ProjectCollaborationStatus]
      : listing.type === "product" && listing.product_collaboration_status
        ? PRODUCT_COLLAB_LABELS[listing.product_collaboration_status as ProductCollaborationStatus]
        : null;

  const lookingFor =
    listing.type === "project"
      ? (listing.project_looking_for ?? [])
      : (listing.product_looking_for ?? []);

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {listing.cover_image_url && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <Image
            src={listing.cover_image_url}
            alt={listing.title}
            width={600}
            height={338}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      )}
      <div className="p-5">
        <div className="mb-2 flex flex-wrap gap-1.5">
          <OpportunityBadge label={primary.label} type={primary.type} />
        </div>
        <h3 className="font-serif text-base font-medium text-zinc-900 group-hover:text-[#002abf] dark:text-zinc-100 line-clamp-2">
          {listing.title}
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {primary.description}
        </p>
        {(stageLine || collabLine) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {stageLine && <span>{stageLine}</span>}
            {collabLine && <span>{collabLine}</span>}
          </div>
        )}
        {lookingFor.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            Looking for: {lookingFor.map((v) => v.replace(/_/g, " ")).join(", ")}
          </p>
        )}
        {(listing.location || listing.year) && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            {[listing.location, listing.year].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function OpportunitiesPage() {
  const listings = await getOpportunities();

  return (
    <main>
      <Container>
        <div className="py-12 md:py-16">
          <div className="mb-8 max-w-2xl">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 md:text-4xl">
              Opportunities
            </h1>
            <p className="mt-3 text-base text-zinc-500 dark:text-zinc-400">
              Industry signals, concept designs, prototypes seeking manufacturers,
              and projects open for collaboration.
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No opportunities right now. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <OpportunityCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}

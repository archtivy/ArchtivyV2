import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE_CLASS,
  PRODUCT_STAGE_LABELS,
  PRODUCT_STAGE_BADGE_CLASS,
  PROJECT_COLLAB_LABELS,
  PRODUCT_COLLAB_LABELS,
  type ProjectStatus,
  type ProductStage,
  type ProjectCollaborationStatus,
  type ProductCollaborationStatus,
} from "@/lib/lifecycle";

interface ProjectCollaborationSectionProps {
  project_status?: string | null;
  project_collaboration_status?: string | null;
  project_looking_for?: string[] | null;
  ownerEmail?: string | null;
}

interface ProductCollaborationSectionProps {
  product_stage?: string | null;
  product_collaboration_status?: string | null;
  product_looking_for?: string[] | null;
  ownerEmail?: string | null;
}

const OPEN_PROJECT_COLLAB = new Set([
  "open_for_collaboration",
  "seeking_partners",
  "seeking_suppliers",
  "seeking_brands",
]);

const OPEN_PRODUCT_COLLAB = new Set([
  "seeking_manufacturer",
  "open_to_manufacturing_partnership",
  "open_to_licensing",
  "seeking_brand_partner",
]);

export function ProjectCollaborationSection({
  project_status,
  project_collaboration_status,
  project_looking_for,
}: ProjectCollaborationSectionProps) {
  const hasStatus = Boolean(project_status);
  const hasCollab = Boolean(project_collaboration_status);
  const hasLooking = (project_looking_for ?? []).length > 0;

  if (!hasStatus && !hasCollab && !hasLooking) return null;

  const statusLabel = project_status
    ? (PROJECT_STATUS_LABELS[project_status as ProjectStatus] ?? null)
    : null;
  const statusBadgeClass = project_status
    ? (PROJECT_STATUS_BADGE_CLASS[project_status as ProjectStatus] ??
        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")
    : null;

  const collabLabel = project_collaboration_status
    ? (PROJECT_COLLAB_LABELS[project_collaboration_status as ProjectCollaborationStatus] ?? null)
    : null;

  const isOpen =
    project_collaboration_status != null &&
    OPEN_PROJECT_COLLAB.has(project_collaboration_status);

  const lookingFor = (project_looking_for ?? []).filter(Boolean);

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Collaboration
      </h2>
      <div className="flex flex-wrap gap-3">
        {statusLabel && statusBadgeClass && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass}`}
          >
            {statusLabel}
          </span>
        )}
        {collabLabel && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isOpen
                ? "bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20 dark:text-blue-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {collabLabel}
          </span>
        )}
      </div>
      {lookingFor.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            Looking for
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lookingFor.map((v) => (
              <span
                key={v}
                className="inline-flex items-center rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {v.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ProductCollaborationSection({
  product_stage,
  product_collaboration_status,
  product_looking_for,
}: ProductCollaborationSectionProps) {
  const hasStage = Boolean(product_stage);
  const hasCollab = Boolean(product_collaboration_status);
  const hasLooking = (product_looking_for ?? []).length > 0;

  if (!hasStage && !hasCollab && !hasLooking) return null;

  const stageLabel = product_stage
    ? (PRODUCT_STAGE_LABELS[product_stage as ProductStage] ?? null)
    : null;
  const stageBadgeClass = product_stage
    ? (PRODUCT_STAGE_BADGE_CLASS[product_stage as ProductStage] ??
        "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400")
    : null;

  const collabLabel = product_collaboration_status
    ? (PRODUCT_COLLAB_LABELS[product_collaboration_status as ProductCollaborationStatus] ?? null)
    : null;

  const isOpen =
    product_collaboration_status != null &&
    OPEN_PRODUCT_COLLAB.has(product_collaboration_status);

  const lookingFor = (product_looking_for ?? []).filter(Boolean);

  return (
    <section className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Collaboration
      </h2>
      <div className="flex flex-wrap gap-3">
        {stageLabel && stageBadgeClass && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${stageBadgeClass}`}
          >
            {stageLabel}
          </span>
        )}
        {collabLabel && (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              isOpen
                ? "bg-[#002abf]/10 text-[#002abf] dark:bg-[#002abf]/20 dark:text-blue-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            {collabLabel}
          </span>
        )}
      </div>
      {lookingFor.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            Looking for
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lookingFor.map((v) => (
              <span
                key={v}
                className="inline-flex items-center rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {v.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

import {
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
  PRODUCT_STAGE_BADGE_CLASS,
  PRODUCT_STAGE_LABELS,
  OPPORTUNITY_TYPE_BADGE_CLASS,
  type ProjectStatus,
  type ProductStage,
  type OpportunityType,
} from "@/lib/lifecycle";

interface StatusBadgeProps {
  label: string;
  className?: string;
}

function StatusBadge({ label, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium leading-tight ${className ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
    >
      {label}
    </span>
  );
}

export function ProjectStatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  if (!status) return null;
  const label = PROJECT_STATUS_LABELS[status as ProjectStatus];
  if (!label) return null;
  const cls = PROJECT_STATUS_BADGE_CLASS[status as ProjectStatus];
  return <StatusBadge label={label} className={cls} />;
}

export function ProductStageBadge({
  stage,
}: {
  stage: string | null | undefined;
}) {
  if (!stage) return null;
  const label = PRODUCT_STAGE_LABELS[stage as ProductStage];
  if (!label) return null;
  const cls = PRODUCT_STAGE_BADGE_CLASS[stage as ProductStage];
  return <StatusBadge label={label} className={cls} />;
}

export function OpportunityBadge({
  type,
  label,
}: {
  type: OpportunityType | string;
  label: string;
}) {
  const cls = OPPORTUNITY_TYPE_BADGE_CLASS[type] ?? OPPORTUNITY_TYPE_BADGE_CLASS.industry_signal;
  return <StatusBadge label={label} className={cls} />;
}

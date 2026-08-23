import {
  PROJECT_STATUS_LABELS,
  PRODUCT_STAGE_LABELS,
  PROJECT_COLLAB_LABELS,
  PRODUCT_COLLAB_LABELS,
  type ProjectStatus,
  type ProductStage,
} from "@/lib/lifecycle";

/**
 * Lifecycle badges (Madde 11).
 *
 * ── COLOUR IS NEVER THE ONLY SIGNAL ─────────────────────────────────────────
 * Every badge carries its label as text. Tone is a secondary cue, so the badge
 * still reads correctly in greyscale, to a screen reader, and to the ~8% of
 * men with a colour vision deficiency. The previous version already did this;
 * it is restated because it is the requirement most easily lost in a restyle.
 *
 * ── ONLY WHEN IT IS NEWS ────────────────────────────────────────────────────
 * A badge appears when the status is NOT the ordinary resting state. 102 of
 * 131 live projects are "completed" — badging those would put a label on
 * almost every card that says only "this project is like every other project".
 * The badge earns its place by marking the exception: under construction, a
 * concept, seeking a manufacturer.
 *
 * ── CASE IS NORMALISED ON READ ──────────────────────────────────────────────
 * project_status holds both "Completed" (94 rows) and "completed" (8), because
 * an early import wrote the capitalised form. A migration normalises the data;
 * this normalises the lookup, so the two cannot disagree in the meantime and a
 * future import that gets the case wrong degrades to a hidden badge rather
 * than a crash.
 */

/** Statuses that mean "nothing to report" and so render no badge. */
const PROJECT_DEFAULT_STATES = new Set(["completed"]);
const PRODUCT_DEFAULT_STATES = new Set(["in_production"]);
const COLLAB_DEFAULT_STATES = new Set(["not_open_for_collaboration"]);

type Tone = "neutral" | "active" | "open";

const TONE_CLASS: Record<Tone, string> = {
  // Editorial ground: stone fill, ink text. Was zinc-100/zinc-600 with dark:
  // variants, from before the cream palette.
  neutral: "bg-stone text-ink",
  // In progress — warm, but still ink-legible rather than a colour-only cue.
  active: "bg-[#EADFC8] text-[#5C4413]",
  // Open to collaboration — the one badge that is an invitation, so it is the
  // only one that reads as a call rather than a state.
  open: "bg-ink text-cream",
};

const PROJECT_TONE: Record<string, Tone> = {
  under_construction: "active",
  design_development: "active",
  concept: "neutral",
  competition_entry: "neutral",
  unbuilt: "neutral",
};

const PRODUCT_TONE: Record<string, Tone> = {
  concept: "neutral",
  in_development: "active",
  prototype: "active",
  production_ready: "active",
  limited_production: "neutral",
  custom_made: "neutral",
  discontinued: "neutral",
};

function normalise(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-body text-[11px] leading-none tracking-[0.02em] ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: string | null | undefined }) {
  const key = normalise(status);
  if (!key || PROJECT_DEFAULT_STATES.has(key)) return null;
  const label = PROJECT_STATUS_LABELS[key as ProjectStatus];
  if (!label) return null;
  return <Badge label={label} tone={PROJECT_TONE[key] ?? "neutral"} />;
}

export function ProductStageBadge({ stage }: { stage: string | null | undefined }) {
  const key = normalise(stage);
  if (!key || PRODUCT_DEFAULT_STATES.has(key)) return null;
  const label = PRODUCT_STAGE_LABELS[key as ProductStage];
  if (!label) return null;
  return <Badge label={label} tone={PRODUCT_TONE[key] ?? "neutral"} />;
}

/**
 * Collaboration is an invitation, not a state, so it is a separate badge —
 * a project can be under construction AND seeking suppliers.
 */
export function CollaborationBadge({
  status,
  kind,
}: {
  status: string | null | undefined;
  kind: "project" | "product";
}) {
  const key = normalise(status);
  if (!key || COLLAB_DEFAULT_STATES.has(key)) return null;
  const labels = kind === "project" ? PROJECT_COLLAB_LABELS : PRODUCT_COLLAB_LABELS;
  const label = (labels as Record<string, string>)[key];
  if (!label) return null;
  return <Badge label={label} tone="open" />;
}

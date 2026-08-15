/**
 * Status pill.
 *
 * The admin area currently spells the same idea four different ways — a green
 * "Yes", an amber rounded-full, a zinc bordered rectangle, a bare coloured
 * word. This is the single vocabulary.
 *
 * Tones are semantic, not decorative: `attention` means a human must act,
 * `positive` means settled and live, `neutral` means recorded but inert. A
 * reviewer should be able to read the colour alone across a 50-row table.
 */

export type PillTone = "neutral" | "positive" | "attention" | "critical" | "info";

const TONE: Record<PillTone, string> = {
  // Settled, inert. Deliberately the quietest — most rows are this, and a
  // table where every row is coloured conveys nothing.
  neutral: "border-hairline bg-stone/30 text-muted",
  positive: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  attention: "border-amber-200/70 bg-amber-50 text-amber-700",
  critical: "border-red-200/70 bg-red-50 text-red-600",
  info: "border-archtivy-primary/20 bg-archtivy-primary/[0.07] text-archtivy-primary",
};

export function StatusPill({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  /** A leading dot, for statuses scanned in a dense column. */
  dot?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1",
        "font-body text-[12px] font-medium leading-none",
        TONE[tone],
      ].join(" ")}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/**
 * Listing status → tone. Centralised because the vocabulary is genuinely
 * three-valued now (DRAFT was added by the publish-flow migration) and every
 * table that shows it must agree.
 */
export function ListingStatusPill({ status }: { status: string | null | undefined }) {
  const s = (status ?? "").toUpperCase();
  if (s === "APPROVED") return <StatusPill tone="positive" dot>Live</StatusPill>;
  if (s === "PENDING") return <StatusPill tone="attention" dot>Pending review</StatusPill>;
  if (s === "DRAFT") return <StatusPill tone="neutral" dot>Draft</StatusPill>;
  return <StatusPill tone="neutral">{status || "—"}</StatusPill>;
}

/** Shared by claims and leads, which use the same three-word vocabulary. */
export function RequestStatusPill({ status }: { status: string | null | undefined }) {
  const s = (status ?? "").toLowerCase();
  if (s === "approved") return <StatusPill tone="positive" dot>Approved</StatusPill>;
  if (s === "pending") return <StatusPill tone="attention" dot>Pending</StatusPill>;
  if (s === "rejected") return <StatusPill tone="critical" dot>Rejected</StatusPill>;
  return <StatusPill tone="neutral">{status || "—"}</StatusPill>;
}

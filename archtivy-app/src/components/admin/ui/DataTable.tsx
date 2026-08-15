import type { ReactNode } from "react";
import { TYPE, SURFACE, ROW_DIVIDER } from "./tokens";

/**
 * Table primitives for the admin management surfaces.
 *
 * The brief is exact about this: the problem with the old tables was never that
 * they were tables. Scanning 50 rows and bulk-approving them is the one job a
 * card grid does badly. So the grid stays and the *finish* changes —
 *
 *   · the outer card owns the only hard border; rows are separated by a
 *     hairline at 60% so the grid reads as texture, not as a cage
 *   · 14px cells on a 56px row, up from a 40px row — the single biggest
 *     contributor to the old "raw" feeling was vertical cramping
 *   · the header is cream rather than white, so it separates from the body
 *     without needing a heavy rule under it
 *   · one hover state, applied to the whole row, at a weight low enough to
 *     survive being right next to a selected row
 *
 * Column alignment is a prop rather than a class on every cell, because the
 * numeric columns were inconsistently aligned across the four existing tables.
 */

export type Align = "left" | "right" | "center";

const ALIGN: Record<Align, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function TableShell({ children }: { children: ReactNode }) {
  return <div className={`overflow-hidden ${SURFACE}`}>{children}</div>;
}

/**
 * A bar above the table body — used for the bulk-action strip and for
 * success/error banners, so both sit inside the card rather than floating
 * above it.
 */
export function TableBar({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "critical" | "selection";
}) {
  const cls =
    tone === "positive"
      ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
      : tone === "critical"
        ? "border-red-100 bg-red-50/70 text-red-700"
        : tone === "selection"
          ? "border-hairline bg-archtivy-primary/[0.05] text-ink"
          : "border-hairline bg-cream/60 text-ink";
  return (
    <div className={`flex flex-wrap items-center gap-3 border-b px-5 py-3.5 font-body text-[14px] ${cls}`}>
      {children}
    </div>
  );
}

export function Table({ children, minWidth = 880 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-cream/70">
      <tr className={`border-b ${ROW_DIVIDER}`}>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = "left",
  width,
}: {
  children?: ReactNode;
  align?: Align;
  width?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-5 py-3 ${ALIGN[align]} ${TYPE.columnHeader}`}
      style={width ? { width } : undefined}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  selected = false,
}: {
  children: ReactNode;
  selected?: boolean;
}) {
  return (
    <tr
      className={[
        "group border-b transition-colors duration-100 last:border-b-0",
        ROW_DIVIDER,
        selected ? "bg-archtivy-primary/[0.045]" : "hover:bg-cream/70",
      ].join(" ")}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = "left",
  className = "",
}: {
  children?: ReactNode;
  align?: Align;
  className?: string;
}) {
  return (
    <td className={`px-5 py-4 ${ALIGN[align]} font-body text-[14px] text-ink ${className}`}>
      {children}
    </td>
  );
}

/** Numeric cell — tabular figures so counts line up down the column. */
export function TDNum({ children, muted = false }: { children?: ReactNode; muted?: boolean }) {
  return (
    <td
      className={`px-5 py-4 text-right font-body text-[14px] tabular-nums ${
        muted ? "text-muted" : "text-ink"
      }`}
    >
      {children}
    </td>
  );
}

/**
 * The row-action cluster.
 *
 * Recessed rather than hidden: on desktop it sits at 60% opacity and comes to
 * full strength on hover or focus. A table of 50 rows × 4 links is 200
 * competing blue words, which was a real part of what made the old surface feel
 * raw — but hiding the actions outright would make them undiscoverable, so they
 * stay legible and merely stop shouting.
 *
 * Below `md` there is no hover, so they are visible unconditionally.
 * `focus-within` is what keeps them reachable by keyboard at every width.
 */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <td className="px-5 py-4 text-right">
      <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity duration-150 focus-within:opacity-100 md:opacity-60 md:group-hover:opacity-100">
        {children}
      </div>
    </td>
  );
}

/** Primary cell content: a title with a quiet second line under it. */
export function CellStack({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className={`truncate ${TYPE.cellPrimary}`}>{title}</div>
      {sub ? <div className={`mt-0.5 truncate ${TYPE.meta}`}>{sub}</div> : null}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded border-hairline text-archtivy-primary accent-archtivy-primary focus:ring-2 focus:ring-archtivy-primary/25"
    />
  );
}

/**
 * Empty state inside a table. Takes the real reason rather than a generic
 * "No results", because "nothing matches this filter" and "nothing exists yet"
 * need different next actions from the reader.
 */
export function TableEmpty({
  colSpan,
  title,
  hint,
  action,
}: {
  colSpan: number;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <p className={TYPE.sectionTitle}>{title}</p>
          {hint ? <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>{hint}</p> : null}
          {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
        </div>
      </td>
    </tr>
  );
}

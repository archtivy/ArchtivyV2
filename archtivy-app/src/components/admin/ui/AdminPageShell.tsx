import type { ReactNode } from "react";
import Link from "next/link";
import { TYPE, SURFACE, INPUT, SELECT, BTN_SECONDARY } from "./tokens";

/**
 * Page-level chrome for admin management screens.
 *
 * The old AdminPage was a 20-line header with a single 20px title and nothing
 * else — every page then invented its own filter row, so no two agreed on
 * spacing or control height. Header, description, actions, filter toolbar and
 * count are all expressed here so they cannot drift again.
 */

export function AdminPageShell({
  title,
  description,
  actions,
  toolbar,
  children,
}: {
  title: ReactNode;
  /** One line on what this surface is for. Shown under the title. */
  description?: ReactNode;
  actions?: ReactNode;
  /** Filters and search. Sits in its own band between header and content. */
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className={TYPE.pageTitle}>{title}</h1>
          {description ? <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      {toolbar ? <div className="mt-7">{toolbar}</div> : null}

      <div className={toolbar ? "mt-5" : "mt-7"}>{children}</div>
    </div>
  );
}

/** A horizontal band holding search + filters, above the table. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

export function SearchField({
  name,
  defaultValue,
  placeholder,
  width = "w-72",
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  width?: string;
}) {
  return (
    <div className={`relative ${width}`}>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${INPUT} pl-10`}
      />
    </div>
  );
}

export function SelectField({
  name,
  defaultValue,
  options,
  width = "w-44",
}: {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  width?: string;
}) {
  return (
    <div className={`relative ${width}`}>
      <select name={name} defaultValue={defaultValue} className={SELECT}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/** A checkbox styled as a toggle chip, for boolean filters in a filter form. */
export function FilterChip({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-hairline bg-white px-3.5 font-body text-[14px] text-ink transition-colors duration-150 hover:bg-stone/25 has-[:checked]:border-archtivy-primary/40 has-[:checked]:bg-archtivy-primary/[0.06]">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-hairline accent-archtivy-primary focus:ring-2 focus:ring-archtivy-primary/25"
      />
      {label}
    </label>
  );
}

/**
 * Link-based segmented filter (Claims, Leads). Rendered as one connected
 * control rather than four loose buttons, so the set reads as a single choice.
 */
export function SegmentedLinks({
  items,
}: {
  items: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-white p-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={[
            "inline-flex h-8 items-center gap-2 rounded-lg px-3 font-body text-[13px] font-medium transition-colors duration-150",
            it.active ? "bg-ink text-cream" : "text-muted hover:bg-stone/30 hover:text-ink",
          ].join(" ")}
        >
          {it.label}
          {typeof it.count === "number" && it.count > 0 && (
            <span
              className={[
                "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums leading-none",
                it.active ? "bg-cream/20 text-cream" : "bg-stone/50 text-muted",
              ].join(" ")}
            >
              {it.count}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/** Client-side segmented control, for tabs held in React state. */
export function SegmentedButtons<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-hairline bg-white p-1">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            aria-pressed={active}
            className={[
              "inline-flex h-8 items-center gap-2 rounded-lg px-3 font-body text-[13px] font-medium transition-colors duration-150",
              active ? "bg-ink text-cream" : "text-muted hover:bg-stone/30 hover:text-ink",
            ].join(" ")}
          >
            {it.label}
            {typeof it.count === "number" && (
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums leading-none",
                  active ? "bg-cream/20 text-cream" : "bg-stone/50 text-muted",
                ].join(" ")}
              >
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Generic panel for non-table content (forms, trees, grouped settings). */
export function Panel({
  title,
  description,
  actions,
  children,
  padded = true,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <section className={SURFACE}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className={TYPE.sectionTitle}>{title}</h2> : null}
            {description ? <p className={`mt-1 ${TYPE.pageSubtitle}`}>{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

/** Full-panel empty state, for surfaces that are not tables. */
export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${SURFACE} px-6 py-16 text-center`}>
      <div className="mx-auto max-w-sm">
        <p className={TYPE.sectionTitle}>{title}</p>
        {hint ? <p className={`mt-1.5 ${TYPE.pageSubtitle}`}>{hint}</p> : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}

/** Inline error surface — used where a query failed and there is nothing to show. */
export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/60 px-5 py-4 font-body text-[14px] text-red-700">
      {message}
    </div>
  );
}

export { BTN_SECONDARY };

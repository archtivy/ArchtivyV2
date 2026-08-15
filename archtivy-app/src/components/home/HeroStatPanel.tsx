import { Building2, Users, Landmark, Package, Globe } from "lucide-react";
import type { PlatformTotals } from "@/lib/db/platformTotals";

/**
 * Hero statistics panel (Build Brief §2, right side).
 *
 * REAL NUMBERS ONLY. The reference screenshot showed 28,547 projects / 312,540
 * products; those were marketing mockup placeholders. These come from
 * getPlatformTotals(), the same cached source the platform uses elsewhere.
 *
 * No card background per the brief — spaced rows separated by hairline rules.
 * Zero-valued rows are dropped rather than rendered as "0", so the panel
 * degrades to fewer rows instead of advertising an empty archive.
 */

export interface HeroStatPanelProps {
  totals: PlatformTotals;
}

const NUMBER = new Intl.NumberFormat("en-US");

export function HeroStatPanel({ totals }: HeroStatPanelProps) {
  const stats = [
    { key: "projects", label: "Projects", value: totals.projects, Icon: Building2 },
    { key: "designers", label: "Designers", value: totals.designers, Icon: Users },
    { key: "brands", label: "Brands", value: totals.brands, Icon: Landmark },
    { key: "products", label: "Products", value: totals.products, Icon: Package },
    { key: "countries", label: "Countries", value: totals.countries, Icon: Globe },
  ].filter((s) => s.value > 0);

  if (stats.length === 0) return null;

  return (
    // Below lg the panel becomes a horizontal scroll strip beneath the search
    // rather than a tall stack or a hidden element (Build Brief responsive
    // notes; Blueprint §9 — adapt, never remove). Dividers are vertical rules
    // in that orientation and horizontal rules in the desktop column.
    <dl className="flex w-full gap-5 overflow-x-auto lg:block lg:max-w-[240px] lg:gap-0 lg:overflow-visible">
      {stats.map(({ key, label, value, Icon }, i) => (
        <div
          key={key}
          className={[
            "flex shrink-0 items-center gap-3 lg:gap-4 lg:py-4",
            i > 0 ? "border-l border-cream/15 pl-5 lg:border-l-0 lg:border-t lg:pl-0" : "",
          ].join(" ")}
        >
          <Icon
            strokeWidth={1.5}
            className="hidden h-5 w-5 shrink-0 text-cream/70 sm:block"
            aria-hidden
          />
          <div className="flex flex-col-reverse">
            <dt className="whitespace-nowrap font-body text-[13px] text-cream/70">{label}</dt>
            <dd className="font-display text-[26px] font-medium leading-none tracking-tight text-cream">
              {NUMBER.format(value)}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

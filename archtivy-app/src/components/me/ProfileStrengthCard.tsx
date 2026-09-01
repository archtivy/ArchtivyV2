import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { ProfileStrength } from "@/lib/profile/profileStrength";

/**
 * The radial score plus its checklist.
 *
 * The ring is an SVG arc rather than a conic-gradient so it renders identically
 * in every browser and inherits the palette from currentColor. Each unfinished
 * item is a LINK to the place that fixes it — a checklist that only reports is
 * a scoreboard, not a task list.
 */
export function ProfileStrengthCard({ strength }: { strength: ProfileStrength }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  const filled = (strength.percent / 100) * C;

  return (
    <section className="rounded-xl border border-hairline bg-white p-5">
      <h2 className="font-display text-[17px] leading-none tracking-tight text-ink">
        Profile Strength
      </h2>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${strength.percent} percent complete`}>
            <circle cx="56" cy="56" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-stone/50" />
            <circle
              cx="56"
              cy="56"
              r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${C - filled}`}
              transform="rotate(-90 56 56)"
              className="text-ink"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-[24px] tracking-tight text-ink">
            {strength.percent}%
          </span>
        </div>

        <ul className="w-full min-w-0 space-y-2">
          {strength.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <span
                className={[
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
                  item.done ? "border-ink bg-ink text-cream" : "border-hairline text-transparent",
                ].join(" ")}
                aria-hidden
              >
                <Check strokeWidth={2.5} className="h-3 w-3" />
              </span>
              {item.done ? (
                <span className="min-w-0 flex-1 truncate font-body text-[13px] text-muted">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="group flex min-w-0 flex-1 items-center gap-1 font-body text-[13px] text-ink underline-offset-4 hover:underline"
                >
                  <span className="min-w-0 truncate">{item.label}</span>
                  <ArrowRight
                    strokeWidth={1.5}
                    className="h-3.5 w-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-5 font-body text-[12px] leading-[17px] text-muted">
        {strength.complete
          ? "Your profile is complete. Keep your listings current to stay discoverable."
          : "Complete these to help architects and brands find your work."}
      </p>
    </section>
  );
}

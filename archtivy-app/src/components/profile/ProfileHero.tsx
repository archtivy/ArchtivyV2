import Image from "next/image";

interface HeroStat {
  label: string;
  value: number;
}

interface ProfileHeroProps {
  name: string;
  roleLabel: string;
  location: string | null;
  heroImageUrl: string | null;
  stats: HeroStat[];
}

/**
 * Full-bleed 60vh hero for the public profile page.
 * Breaks out of the 1040px PageContainer using calc(-50vw + 50%) margins.
 * Content is re-centered at max-w-[1040px] so it aligns with page content.
 */
export function ProfileHero({
  name,
  roleLabel,
  location,
  heroImageUrl,
  stats,
}: ProfileHeroProps) {
  return (
    <div
      className="relative -mt-6 sm:-mt-8"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
        height: "clamp(380px, 60vh, 680px)",
      }}
    >
      {/* Background: project cover or solid dark */}
      {heroImageUrl ? (
        <Image
          src={heroImageUrl}
          alt=""
          fill
          className="object-cover"
          priority
          unoptimized
          sizes="100vw"
        />
      ) : (
        <div className="absolute inset-0 bg-[#0d0d1a]" />
      )}

      {/* Flat dark overlay — no gradient per design spec */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Identity + stats anchored to bottom.
          pb increased from pb-10/pb-14 to pb-14/pb-18 to add ~10px breathing room
          between the location line and the overlapping sidebar card edge. */}
      <div className="absolute inset-x-0 bottom-0">
        <div
          className="mx-auto px-4 sm:px-6 lg:px-0 pb-14 sm:pb-[4.5rem]"
          style={{ maxWidth: 1040 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-8">
            {/* Left: role label + name + location */}
            <div className="min-w-0">
              {/* Higher opacity (white/80) and tighter tracking for legibility */}
              <p className="text-white/80 text-[11px] font-medium uppercase tracking-[0.14em] mb-2.5">
                {roleLabel}
              </p>
              <h1
                className="text-white leading-[1.05]"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(2rem, 5vw, 3.5rem)",
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                }}
              >
                {name}
              </h1>
              {location && (
                <p className="mt-3 text-white/60 text-sm flex items-center gap-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {location}
                </p>
              )}
            </div>

            {/* Right: architectural metadata stats */}
            {stats.length > 0 && (
              <div className="flex items-end gap-8 sm:gap-12 shrink-0">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-start sm:items-end">
                    <span
                      className="text-white tabular-nums leading-none"
                      style={{
                        fontSize: "clamp(1.5rem, 2.8vw, 2.25rem)",
                        fontWeight: 300,
                      }}
                    >
                      {stat.value}
                    </span>
                    <span className="text-white/50 text-[10px] uppercase tracking-[0.18em] mt-1">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

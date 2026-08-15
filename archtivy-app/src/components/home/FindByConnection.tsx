import Link from "next/link";

/**
 * Find by Connection panel (Build Brief §4, right column).
 *
 * A STATIC, ILLUSTRATIVE SVG — explicitly not an interactive force-graph in v1
 * (Build Brief "Do Not"). It is the literal picture of the entity graph the
 * platform is built on: five satellites orbiting the Archtivy mark.
 *
 * Rendered as inline SVG rather than an image so it inherits the palette and
 * stays crisp at any density. Decorative, so it is aria-hidden — the meaning is
 * carried by the caption and the labelled satellites are repeated as text.
 */

const SATELLITES = [
  { label: "Designers", x: 140, y: 30 },
  { label: "Projects", x: 34, y: 104 },
  { label: "Products", x: 246, y: 104 },
  { label: "Materials", x: 74, y: 208 },
  { label: "Brands", x: 206, y: 208 },
];

const CENTER = { x: 140, y: 124 };

export function FindByConnection() {
  return (
    <div className="flex h-full flex-col rounded-xl bg-stone p-6 sm:p-8">
      <h2 className="font-display text-[20px] leading-[28px] tracking-tight text-ink">
        Find by connection
      </h2>

      <div className="mt-6 flex flex-1 items-center justify-center">
        <svg
          viewBox="0 0 280 260"
          className="h-auto w-full max-w-[280px]"
          role="img"
          aria-label="Diagram: Designers, Projects, Products, Materials and Brands all connect through Archtivy"
        >
          {SATELLITES.map((s) => (
            <line
              key={`line-${s.label}`}
              x1={CENTER.x}
              y1={CENTER.y}
              x2={s.x}
              y2={s.y}
              stroke="#161616"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
          ))}

          {SATELLITES.map((s) => (
            <g key={s.label}>
              <circle cx={s.x} cy={s.y} r="17" fill="#F3F2EE" />
              <circle
                cx={s.x}
                cy={s.y}
                r="17"
                fill="none"
                stroke="#161616"
                strokeOpacity="0.12"
              />
              <text
                x={s.x}
                y={s.y + 33}
                textAnchor="middle"
                fontSize="10"
                fill="#6B6B68"
                fontFamily="var(--font-inter), Inter, sans-serif"
              >
                {s.label}
              </text>
            </g>
          ))}

          <circle cx={CENTER.x} cy={CENTER.y} r="24" fill="#161616" />
          <text
            x={CENTER.x}
            y={CENTER.y + 6}
            textAnchor="middle"
            fontSize="18"
            fill="#F3F2EE"
            fontFamily="var(--font-inter), Inter, sans-serif"
          >
            a
          </text>
        </svg>
      </div>

      <p className="mt-6 text-center font-body text-[13px] leading-[20px] text-muted">
        Everything is connected.
        <br />
        Discover the relationships.
      </p>

      <div className="mt-5 flex justify-center">
        <Link
          href="/explore"
          className="inline-flex rounded-full border border-ink/25 px-5 py-2.5 font-body text-[13px] text-ink transition-colors hover:bg-cream"
        >
          Explore Connections
        </Link>
      </div>
    </div>
  );
}

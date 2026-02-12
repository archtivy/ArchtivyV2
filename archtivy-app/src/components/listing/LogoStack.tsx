import Image from "next/image";

const FALLBACK = "Not specified";

export interface LogoItem {
  src?: string | null;
  name: string;
}

interface LogoStackProps {
  logos: LogoItem[];
  /** Extra count to show as "+N more brands" (or "+N more") */
  moreCount?: number;
  moreLabel?: string;
  /** When true, render nothing instead of "Not specified" when there are no logos */
  hideWhenEmpty?: boolean;
  className?: string;
}

const SIZE = 24;
const OVERLAP = 6;
const MAX_VISIBLE = 4;

export function LogoStack({
  logos,
  moreCount = 0,
  moreLabel = "more brands",
  hideWhenEmpty = false,
  className = "",
}: LogoStackProps) {
  const visible = logos.slice(0, MAX_VISIBLE);
  const totalMore = moreCount + Math.max(0, logos.length - MAX_VISIBLE);

  if (visible.length === 0 && totalMore === 0) {
    if (hideWhenEmpty) return null;
    return (
      <span className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`.trim()}>
        {FALLBACK}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`.trim()}>
      <div className="flex -space-x-1.5" style={{ marginRight: visible.length > 1 ? OVERLAP : 0 }}>
        {visible.map((l, i) => (
          <div
            key={i}
            className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
            style={{ zIndex: visible.length - i }}
            title={l.name || FALLBACK}
          >
            {l.src ? (
              <Image
                src={l.src}
                alt=""
                width={SIZE}
                height={SIZE}
                className="object-contain p-0.5"
                unoptimized
              />
            ) : (
              <span
                className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400"
                aria-hidden
              >
                {(l.name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      {totalMore > 0 && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          +{totalMore} {moreLabel}
        </span>
      )}
    </div>
  );
}

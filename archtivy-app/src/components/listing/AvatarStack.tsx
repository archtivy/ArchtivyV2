import Image from "next/image";

const FALLBACK = "Not specified";

export interface AvatarItem {
  src?: string | null;
  name: string;
}

interface AvatarStackProps {
  avatars: AvatarItem[];
  /** Extra count to show as "+N more team" */
  moreCount?: number;
  /** When true, render nothing instead of "Not specified" when there are no avatars */
  hideWhenEmpty?: boolean;
  className?: string;
}

const SIZE = 24;
const OVERLAP = 8;
const MAX_VISIBLE = 3;

export function AvatarStack({
  avatars,
  moreCount = 0,
  hideWhenEmpty = false,
  className = "",
}: AvatarStackProps) {
  const visible = avatars.slice(0, MAX_VISIBLE);
  const totalMore = moreCount + Math.max(0, avatars.length - MAX_VISIBLE);

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
      <div className="flex -space-x-2" style={{ marginRight: visible.length > 1 ? OVERLAP : 0 }}>
        {visible.map((a, i) => (
          <div
            key={i}
            className="relative inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-700"
            style={{ zIndex: visible.length - i }}
            title={a.name || FALLBACK}
          >
            {a.src ? (
              <Image
                src={a.src}
                alt=""
                width={SIZE}
                height={SIZE}
                className="object-cover"
                unoptimized
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400"
                aria-hidden
              >
                {(a.name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
        ))}
      </div>
      {totalMore > 0 && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          +{totalMore} more team
        </span>
      )}
    </div>
  );
}

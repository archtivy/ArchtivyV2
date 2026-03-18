"use client";

import Link from "next/link";

export interface CollaborationPairData {
  profileA: string;
  profileB: string;
  nameA: string;
  nameB: string;
  sharedCount: number;
}

export interface CollaborationHintsProps {
  pairs: CollaborationPairData[];
  /** Map of profile_id -> username for linking */
  usernameMap: Record<string, string | null>;
}

export function CollaborationHints({ pairs, usernameMap }: CollaborationHintsProps) {
  if (pairs.length === 0) return null;

  return (
    <section aria-labelledby="collab-hints-heading">
      <h2
        id="collab-hints-heading"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        Collaboration Network
      </h2>
      <div className="space-y-2">
        {pairs.map((pair) => {
          const hrefA = usernameMap[pair.profileA]
            ? `/u/${usernameMap[pair.profileA]}`
            : null;
          const hrefB = usernameMap[pair.profileB]
            ? `/u/${usernameMap[pair.profileB]}`
            : null;

          return (
            <div
              key={`${pair.profileA}-${pair.profileB}`}
              className="flex items-start gap-2.5 rounded-md bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50"
            >
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-[#002abf] dark:text-[#5b7cff]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
              <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                {hrefA ? (
                  <Link href={hrefA} className="font-medium text-zinc-900 hover:text-[#002abf] dark:text-zinc-100">
                    {pair.nameA}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{pair.nameA}</span>
                )}
                {" and "}
                {hrefB ? (
                  <Link href={hrefB} className="font-medium text-zinc-900 hover:text-[#002abf] dark:text-zinc-100">
                    {pair.nameB}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{pair.nameB}</span>
                )}
                {" worked together on "}
                <span className="font-semibold text-[#002abf] dark:text-[#5b7cff]">
                  {pair.sharedCount} projects
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

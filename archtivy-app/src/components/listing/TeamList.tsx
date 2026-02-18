"use client";

import Image from "next/image";
import Link from "next/link";

export interface TeamListMember {
  profile_id: string;
  display_name: string | null;
  title: string | null;
  username: string | null;
  avatar_url?: string | null;
}

export interface TeamListProps {
  members: TeamListMember[];
  compact?: boolean;
  className?: string;
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim()[0].toUpperCase();
}

export function TeamList({ members, compact = false, className = "" }: TeamListProps) {
  if (members.length === 0) return null;

  const sizeClass = compact ? "h-8 w-8" : "h-11 w-11";

  return (
    <ul className={"space-y-3 " + className} role="list">
      {members.map((m) => {
        const href = m.username ? "/u/" + m.username : "/u/id/" + m.profile_id;
        const RowContent = (
          <>
            <div className={"relative shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700 " + sizeClass}>
              {m.avatar_url?.trim() ? (
                <Image
                  src={m.avatar_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="44px"
                  unoptimized={m.avatar_url.startsWith("http")}
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {getInitials(m.display_name)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                {m.display_name?.trim() || "—"}
              </span>
              {m.title?.trim() && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{m.title.trim()}</p>
              )}
            </div>
          </>
        );
        const hasProfileLink = m.username != null || (m.profile_id != null && !String(m.profile_id).startsWith("fallback-"));
        return (
          <li key={m.profile_id} className="flex items-center gap-3">
            {hasProfileLink ? (
              <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-1 rounded">
                {RowContent}
              </Link>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-3">{RowContent}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

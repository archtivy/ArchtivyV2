import Link from "next/link";

export interface TeamMemberLinkItem {
  profile_id: string;
  display_name: string | null;
  title: string | null;
  username: string | null;
}

/**
 * Renders team members as links: /u/[username] or /u/id/[profileId] when username is null.
 */
export function TeamMemberLinks({ members }: { members: TeamMemberLinkItem[] }) {
  if (members.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const href = m.username
          ? `/u/${encodeURIComponent(m.username)}`
          : `/u/id/${m.profile_id}`;
        const label = [m.display_name?.trim(), m.title?.trim()].filter(Boolean).join(" · ") || "—";
        return (
          <Link
            key={m.profile_id}
            href={href}
            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:border-archtivy-primary/50 hover:text-archtivy-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-archtivy-primary/50 dark:hover:text-archtivy-primary"
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

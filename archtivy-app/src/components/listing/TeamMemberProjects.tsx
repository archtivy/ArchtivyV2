"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface TeamMemberProjectCard {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
}

export interface TeamMemberWithProjectsData {
  profile_id: string;
  display_name: string | null;
  title: string | null;
  username: string | null;
  avatar_url: string | null;
  projects: TeamMemberProjectCard[];
}

export interface TeamMemberProjectsProps {
  members: TeamMemberWithProjectsData[];
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim()[0].toUpperCase();
}

export function TeamMemberProjects({ members }: TeamMemberProjectsProps) {
  const membersWithProjects = members.filter((m) => m.projects.length > 0);
  if (membersWithProjects.length === 0) return null;

  return (
    <section aria-labelledby="team-projects-heading">
      <h2
        id="team-projects-heading"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        Team Members
      </h2>
      <div className="space-y-3">
        {membersWithProjects.map((m) => (
          <TeamMemberRow key={m.profile_id} member={m} />
        ))}
      </div>
    </section>
  );
}

function TeamMemberRow({ member }: { member: TeamMemberWithProjectsData }) {
  const [expanded, setExpanded] = useState(false);
  const href = member.username
    ? `/u/${member.username}`
    : `/u/id/${member.profile_id}`;
  const hasFallbackId = member.profile_id.startsWith("fallback-");

  return (
    <div>
      <div className="flex items-center gap-3">
        {/* Avatar + name (linkable) */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {hasFallbackId ? (
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <span className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
                  {getInitials(member.display_name)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {member.display_name?.trim() || "—"}
                </span>
                {member.title?.trim() && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.title.trim()}</p>
                )}
              </div>
            </div>
          ) : (
            <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 transition-opacity hover:opacity-90">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                {member.avatar_url?.trim() ? (
                  <Image
                    src={member.avatar_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                    unoptimized={member.avatar_url.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-medium text-zinc-500">
                    {getInitials(member.display_name)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {member.display_name?.trim() || "—"}
                </span>
                {member.title?.trim() && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{member.title.trim()}</p>
                )}
              </div>
            </Link>
          )}
        </div>

        {/* Expand toggle with project count */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#002abf] transition-colors hover:bg-[#002abf]/5 dark:text-[#5b7cff]"
          aria-expanded={expanded}
        >
          {member.projects.length} project{member.projects.length !== 1 ? "s" : ""}
          <svg
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Expandable project list */}
      {expanded && (
        <div className="mt-2 ml-12 space-y-1.5">
          {member.projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.slug ?? p.id}`}
              className="group flex items-center gap-2.5 rounded p-1 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            >
              <span className="relative h-8 w-11 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                {p.cover_image_url ? (
                  <Image
                    src={p.cover_image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="44px"
                    unoptimized={p.cover_image_url.startsWith("http")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] text-zinc-400">—</span>
                )}
              </span>
              <span className="truncate text-xs font-medium text-zinc-700 group-hover:text-[#002abf] dark:text-zinc-300">
                {p.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

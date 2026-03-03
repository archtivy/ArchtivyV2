"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProfileEditButton } from "@/components/profile/ProfileEditButton";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import type { Profile } from "@/lib/types/profiles";
import type { CollaboratorItem } from "@/lib/db/listingTeamMembers";

interface ProfileSidebarProps {
  profile: Profile;
  isOwner: boolean;
  resolvedAvatarUrl: string | null;
  showClaim: boolean;
  claimPending: boolean;
  firstListingForContact: { id: string; type: "project" | "product"; title: string } | null;
  collaborators: CollaboratorItem[];
  decodedUsername: string;
}

/**
 * Sticky left-column sidebar for the profile detail page.
 * Client component — owns bio expand/collapse state.
 * Floats over the hero bottom edge via the parent's negative top margin.
 */
export function ProfileSidebar({
  profile,
  isOwner,
  resolvedAvatarUrl,
  showClaim,
  claimPending,
  firstListingForContact,
  collaborators,
  decodedUsername,
}: ProfileSidebarProps) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const claimHref = `/u/${encodeURIComponent(profile.username ?? decodedUsername)}/claim`;

  return (
    <div
      className="relative bg-white border border-zinc-100"
      style={{ borderRadius: 4, boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)" }}
    >
      {/* Claim icon button — top-right, only when not pending */}
      {showClaim && !claimPending && (
        <Link
          href={claimHref}
          title="Claim this profile"
          aria-label="Claim this profile"
          className="absolute top-3 right-3 w-[22px] h-[22px] flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-[#002abf] hover:border-[#002abf] transition-colors"
          style={{ borderRadius: "50%" }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </Link>
      )}

      {/* Avatar + name — no type label/chip here */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-zinc-50">
        <div className="shrink-0">
          {resolvedAvatarUrl ? (
            <Image
              src={resolvedAvatarUrl}
              alt={profile.display_name ?? profile.username ?? "Avatar"}
              width={52}
              height={52}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-[52px] h-[52px] rounded-full bg-zinc-100 flex items-center justify-center text-base font-semibold text-zinc-400">
              {(profile.display_name ?? profile.username ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
            {profile.display_name ?? profile.username ?? "Profile"}
          </p>
          {profile.username && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">@{profile.username}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* CTAs */}
        {isOwner ? (
          <ProfileEditButton
            profile={profile}
            editForm={<ProfileEditForm profile={profile} />}
          />
        ) : (
          <div className="flex gap-2">
            {firstListingForContact ? (
              <ProfileContactButton
                listingId={firstListingForContact.id}
                listingType={firstListingForContact.type}
                listingTitle={firstListingForContact.title}
                className="flex-1 justify-center !rounded-full !h-9 !py-0 !bg-[#002abf] !text-white !border-[#002abf] hover:!bg-[#0024a8] hover:!border-[#0024a8]"
              />
            ) : null}
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center rounded-full h-9 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-[#002abf] hover:text-[#002abf] focus:outline-none focus:ring-2 focus:ring-[#002abf] focus:ring-offset-2"
            >
              Follow
            </button>
          </div>
        )}

        {/* Claim pending notice */}
        {showClaim && claimPending && (
          <p className="text-xs text-amber-700">Claim request pending review.</p>
        )}

        {/* Bio with expand/collapse toggle */}
        {profile.bio && (
          <div>
            <p
              className={`text-sm text-zinc-600 leading-relaxed transition-all${
                !bioExpanded ? " line-clamp-4" : ""
              }`}
            >
              {profile.bio}
            </p>
            <button
              type="button"
              onClick={() => setBioExpanded((v) => !v)}
              aria-label={bioExpanded ? "Collapse bio" : "Expand bio"}
              className="mt-2 mx-auto flex w-7 h-7 items-center justify-center border border-zinc-200 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-500 transition-colors"
              style={{ borderRadius: "50%" }}
            >
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
                style={{
                  transform: bioExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}

        {/* Social links — vertical labeled rows: label (zinc-400) + value (zinc-700) */}
        {(profile.website || profile.instagram || profile.linkedin) && (
          <div className="space-y-2">
            {profile.website && (
              <a
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 group"
              >
                <span className="shrink-0 text-[10px] text-zinc-400 uppercase tracking-[0.1em] w-[4.5rem]">
                  Website
                </span>
                <span className="text-xs text-zinc-700 truncate group-hover:text-[#002abf] transition-colors">
                  {profile.website.replace(/^https?:\/\/(www\.)?/, "")}
                </span>
              </a>
            )}
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 group"
              >
                <span className="shrink-0 text-[10px] text-zinc-400 uppercase tracking-[0.1em] w-[4.5rem]">
                  Instagram
                </span>
                <span className="text-xs text-zinc-700 truncate group-hover:text-[#002abf] transition-colors">
                  @{profile.instagram.replace(/^@/, "")}
                </span>
              </a>
            )}
            {profile.linkedin && (
              <a
                href={
                  profile.linkedin.startsWith("http")
                    ? profile.linkedin
                    : `https://linkedin.com/in/${profile.linkedin}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 min-w-0 group"
              >
                <span className="shrink-0 text-[10px] text-zinc-400 uppercase tracking-[0.1em] w-[4.5rem]">
                  LinkedIn
                </span>
                <span className="text-xs text-zinc-700 truncate group-hover:text-[#002abf] transition-colors">
                  {profile.linkedin.replace(/^https?:\/\/(www\.)?(linkedin\.com\/)?/, "")}
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Frequently collaborated with */}
      {collaborators.length > 0 && (
        <div className="px-5 pb-5 border-t border-zinc-100">
          <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider py-4">
            Frequently collaborated with
          </p>
          <div className="space-y-3">
            {collaborators.map((c) => {
              const href = c.username ? `/u/${c.username}` : `/u/id/${c.profile_id}`;
              return (
                <Link key={c.profile_id} href={href} className="flex items-center gap-2.5 group">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 overflow-hidden">
                    {c.avatar_url ? (
                      <Image
                        src={c.avatar_url}
                        alt={c.display_name ?? ""}
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-zinc-400">
                        {(c.display_name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-zinc-700 group-hover:text-[#002abf] truncate transition-colors">
                      {c.display_name ?? c.username ?? "Profile"}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {c.count} project{c.count !== 1 ? "s" : ""} together
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

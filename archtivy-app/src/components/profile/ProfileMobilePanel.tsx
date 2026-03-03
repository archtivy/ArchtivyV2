"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import type { Profile } from "@/lib/types/profiles";

interface ProfileMobilePanelProps {
  profile: Profile;
  isOwner: boolean;
  resolvedAvatarUrl: string | null;
  showClaim: boolean;
  claimPending: boolean;
  firstListingForContact: { id: string; type: "project" | "product"; title: string } | null;
  decodedUsername: string;
}

export function ProfileMobilePanel({
  profile,
  isOwner,
  resolvedAvatarUrl,
  showClaim,
  claimPending,
  firstListingForContact,
  decodedUsername,
}: ProfileMobilePanelProps) {
  const [bioExpanded, setBioExpanded] = useState(false);

  const claimHref = `/u/${encodeURIComponent(profile.username ?? decodedUsername)}/claim`;

  return (
    <div
      className="bg-white border border-zinc-100"
      style={{ borderRadius: 16, boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)", padding: "18px" }}
    >
      {/* Row 1: Avatar + name + @username */}
      <div className="flex items-center gap-3 mb-4">
        <div className="shrink-0">
          {resolvedAvatarUrl ? (
            <Image
              src={resolvedAvatarUrl}
              alt={profile.display_name ?? profile.username ?? "Avatar"}
              width={44}
              height={44}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-400">
              {(profile.display_name ?? profile.username ?? "?")[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
            {profile.display_name ?? profile.username ?? "Profile"}
          </p>
          {profile.username && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">@{profile.username}</p>
          )}
        </div>
      </div>

      {/* Row 2: CTAs */}
      {isOwner ? (
        <Link
          href="/me"
          className="mb-4 flex items-center justify-center rounded-full h-9 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-[#002abf] hover:text-[#002abf]"
        >
          Edit profile
        </Link>
      ) : (
        <div className="flex gap-2 mb-4">
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

      {/* Row 3: Bio with expand/collapse */}
      {profile.bio && (
        <div className="mb-4">
          <p
            className={`text-sm text-zinc-600 leading-relaxed transition-all${
              !bioExpanded ? " line-clamp-3" : ""
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

      {/* Row 4: Social links — vertical labeled rows */}
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

      {/* Claim notice */}
      {showClaim && (
        <div className="mt-3">
          {claimPending ? (
            <p className="text-xs text-amber-700">Claim request pending review.</p>
          ) : (
            <Link
              href={claimHref}
              className="text-xs text-zinc-400 hover:text-[#002abf] underline transition-colors"
            >
              Claim this profile
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

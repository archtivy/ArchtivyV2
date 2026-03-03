"use client";

import { useState } from "react";
import Link from "next/link";
import { ProfileContactButton } from "@/components/profile/ProfileContactButton";
import type { Profile } from "@/lib/types/profiles";

interface ProfileMobilePanelProps {
  profile: Profile;
  isOwner: boolean;
  showClaim: boolean;
  claimPending: boolean;
  firstListingForContact: { id: string; type: "project" | "product"; title: string } | null;
  decodedUsername: string;
}

export function ProfileMobilePanel({
  profile,
  isOwner,
  showClaim,
  claimPending,
  firstListingForContact,
  decodedUsername,
}: ProfileMobilePanelProps) {
  const [expanded, setExpanded] = useState(false);

  const claimHref = `/u/${encodeURIComponent(profile.username ?? decodedUsername)}/claim`;

  return (
    <div
      className="relative bg-white border border-zinc-100"
      style={{ borderRadius: 16, boxShadow: "0 2px 6px 0 rgba(0,0,0,0.05)", padding: "16px" }}
    >
      {/* Claim icon — top-right, only when not pending */}
      {showClaim && !claimPending && (
        <Link
          href={claimHref}
          title="Claim this profile"
          aria-label="Claim this profile"
          className="absolute top-3 right-3 w-[20px] h-[20px] flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-[#002abf] hover:border-[#002abf] transition-colors"
          style={{ borderRadius: "50%" }}
        >
          <svg
            width="10"
            height="10"
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

      {/* CTAs */}
      {isOwner ? (
        <Link
          href="/me"
          className="flex items-center justify-center rounded-full h-9 border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:border-[#002abf] hover:text-[#002abf] mb-3"
        >
          Edit profile
        </Link>
      ) : (
        <div className="flex gap-2 mb-3">
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

      {/* Bio */}
      {profile.bio && (
        <div className="mb-3">
          <p className={`text-sm text-zinc-600 leading-relaxed${expanded ? "" : " line-clamp-3"}`}>
            {profile.bio}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse bio" : "Expand bio"}
            className="flex items-center justify-center mx-auto mt-2 w-8 h-8 rounded-full border border-zinc-200 hover:bg-zinc-50 transition-colors"
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
              className={`text-zinc-500 transition-transform${expanded ? " rotate-180" : ""}`}
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      )}

      {/* Social icons row */}
      {(profile.website || profile.instagram || profile.linkedin) && (
        <div className="flex items-center gap-3.5">
          {profile.website && (
            <a
              href={
                profile.website.startsWith("http")
                  ? profile.website
                  : `https://${profile.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-[#002abf] transition-colors"
              aria-label="Website"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </a>
          )}
          {profile.instagram && (
            <a
              href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-[#002abf] transition-colors"
              aria-label="Instagram"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
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
              className="text-zinc-400 hover:text-[#002abf] transition-colors"
              aria-label="LinkedIn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Claim pending notice */}
      {showClaim && claimPending && (
        <p className="text-xs text-amber-700 mt-3">Claim request pending review.</p>
      )}
    </div>
  );
}

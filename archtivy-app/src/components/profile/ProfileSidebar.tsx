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
 * Renders bio, links, CTA, and collaborators.
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
  const showDiscipline =
    profile.role === "designer" &&
    !!profile.designer_discipline &&
    (profile as { show_designer_discipline?: boolean }).show_designer_discipline !== false;
  const showBrandType =
    profile.role === "brand" &&
    !!profile.brand_type &&
    (profile as { show_brand_type?: boolean }).show_brand_type !== false;
  const tag = showDiscipline
    ? profile.designer_discipline
    : showBrandType
    ? profile.brand_type
    : null;

  return (
    <div
      className="bg-white border border-zinc-100"
      style={{ borderRadius: 4, boxShadow: "0 2px 8px 0 rgba(0,0,0,0.06)" }}
    >
      {/* Avatar + name */}
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
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
            {profile.display_name ?? profile.username ?? "Profile"}
          </p>
          {tag && (
            <p className="text-xs text-zinc-400 mt-0.5 truncate">{tag}</p>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-zinc-600 leading-relaxed line-clamp-4">
            {profile.bio}
          </p>
        )}

        {/* Discipline / brand type tag chip */}
        {tag && (
          <div>
            <span
              className="inline-block text-[11px] font-medium text-zinc-500 uppercase tracking-wider border border-zinc-200 px-2 py-0.5"
              style={{ borderRadius: 2 }}
            >
              {tag}
            </span>
          </div>
        )}

        {/* Website + social icons */}
        {(profile.website || profile.instagram || profile.linkedin) && (
          <div className="flex flex-wrap items-center gap-2">
            {profile.website && (
              <a
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#002abf] transition-colors"
                aria-label="Website"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Website
              </a>
            )}
            {profile.instagram && (
              <a
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-7 h-7 border border-zinc-200 text-zinc-500 hover:text-[#002abf] hover:border-[#002abf] transition-colors"
                style={{ borderRadius: 3 }}
                aria-label="Instagram"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
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
                className="inline-flex items-center justify-center w-7 h-7 border border-zinc-200 text-zinc-500 hover:text-[#002abf] hover:border-[#002abf] transition-colors"
                style={{ borderRadius: 3 }}
                aria-label="LinkedIn"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
          </div>
        )}

        {/* CTA: Edit (owner) or Connect (visitor) */}
        {isOwner ? (
          <ProfileEditButton
            profile={profile}
            editForm={<ProfileEditForm profile={profile} />}
          />
        ) : firstListingForContact ? (
          <ProfileContactButton
            listingId={firstListingForContact.id}
            listingType={firstListingForContact.type}
            listingTitle={firstListingForContact.title}
            className="w-full justify-center !bg-[#002abf] !text-white !border-[#002abf] hover:!bg-[#0024a8] hover:!border-[#0024a8]"
          />
        ) : null}

        {/* Claim profile */}
        {showClaim && (
          <div>
            {claimPending ? (
              <p className="text-xs text-amber-700">Claim request pending review.</p>
            ) : (
              <Link
                href={`/u/${encodeURIComponent(profile.username ?? decodedUsername)}/claim`}
                className="text-xs text-zinc-400 hover:text-[#002abf] underline transition-colors"
              >
                Claim this profile
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Frequently collaborated with */}
      {collaborators.length > 0 && (
        <div className="px-5 pb-5 pt-0 border-t border-zinc-100 mt-1">
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

import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/lib/types/profiles";

export interface ProfileCardProps {
  profile: Profile;
}

function SocialIcon({
  href,
  ariaLabel,
  children,
}: {
  href: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 bg-white text-zinc-500 transition hover:border-[#002abf]/30 hover:bg-zinc-50 hover:text-[#002abf] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-[#002abf]/40 dark:hover:bg-zinc-800 dark:hover:text-[#002abf]"
      style={{ borderRadius: 4 }}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const displayName = profile.display_name ?? profile.username ?? (profile.role === "designer" ? "Designer" : "Brand");
  const roleLabel =
    profile.role === "designer"
      ? (profile.designer_discipline?.trim() || null)
      : (profile.brand_type?.trim() || null);
  const hasSocial =
    (profile.website?.trim() && true) ||
    (profile.instagram?.trim() && true) ||
    (profile.linkedin?.trim() && true);

  return (
    <Link
      href={`/u/${encodeURIComponent(profile.username ?? "")}`}
      className="flex h-full flex-col items-center rounded border border-zinc-200 bg-white p-4 transition hover:border-[#002abf]/30 hover:bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#002abf]/40 dark:hover:bg-zinc-900/80"
      style={{ borderRadius: 4 }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={80}
              height={80}
              className="object-cover"
              unoptimized={!profile.avatar_url.includes("supabase.co")}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-medium text-zinc-500 dark:text-zinc-400">
              {displayName[0]?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <h2 className="mt-3 font-medium text-zinc-900 dark:text-zinc-100">
          {displayName}
        </h2>
        {roleLabel && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {roleLabel}
          </p>
        )}
        {hasSocial && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {profile.website?.trim() && (
              <SocialIcon
                href={
                  profile.website.startsWith("http")
                    ? profile.website
                    : `https://${profile.website}`
                }
                ariaLabel="Website"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </SocialIcon>
            )}
            {profile.instagram?.trim() && (
              <SocialIcon
                href={`https://instagram.com/${profile.instagram.replace(/^@/, "")}`}
                ariaLabel="Instagram"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </SocialIcon>
            )}
            {profile.linkedin?.trim() && (
              <SocialIcon
                href={
                  profile.linkedin.startsWith("http")
                    ? profile.linkedin
                    : `https://linkedin.com/in/${profile.linkedin}`
                }
                ariaLabel="LinkedIn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </SocialIcon>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

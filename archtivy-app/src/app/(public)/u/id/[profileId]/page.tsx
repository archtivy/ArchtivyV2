import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByIdForPublicPage } from "@/lib/db/profiles";
import { getAbsoluteUrl } from "@/lib/canonical";

import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { loadProfilePageProps } from "@/lib/profile/loadProfilePage";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ profileId: string }>;
}): Promise<Metadata> {
  const { profileId } = await params;
  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data as ({ is_hidden?: boolean; username?: string | null;
    display_name?: string | null; avatar_url?: string | null }) | null;
  if (!profile || profile.is_hidden === true) {
    return { robots: { index: false, follow: false } };
  }

  const username = profile.username?.trim();
  if (username) {
    // The page redirects; point the canonical at the destination regardless.
    return {
      robots: { index: false, follow: true },
      alternates: { canonical: getAbsoluteUrl(`/u/${encodeURIComponent(username)}`) },
    };
  }

  const path = `/u/id/${profileId}`;
  const title = profile.display_name?.trim() || "Profile";
  const description = `${title} on Archtivy. Projects, products & credits for architecture.`;
  const imageUrl = profile.avatar_url?.startsWith("http") ? profile.avatar_url : undefined;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: getAbsoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(path),
      ...(imageUrl && { images: [{ url: imageUrl, width: 200, height: 200, alt: title }] }),
    },
  };
}

export default async function ProfileByIdPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  const profileResult = await getProfileByIdForPublicPage(profileId);
  const profile = profileResult.data;
  if (!profile) notFound();
  if ((profile as { is_hidden?: boolean }).is_hidden === true) notFound();

  // Collapse the duplicate: /u/id/{uuid} and /u/{username} are the same profile.
  // See TECHNICAL_SEO_AUDIT.md C-7.
  const canonicalUsername = profile.username?.trim();
  if (canonicalUsername) {
    permanentRedirect(`/u/${encodeURIComponent(canonicalUsername)}`);
  }

  // No username, so this route renders the page itself — which is the common
  // case, not the fallback: 158 of 199 profiles have no username. It renders
  // the SAME component as /u/[username] rather than a second layout.
  const props = await loadProfilePageProps(profile);

  return <ProfilePageView profile={profile} {...props} />;
}

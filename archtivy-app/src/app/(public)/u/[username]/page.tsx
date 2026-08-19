// ISR: data cache revalidates every hour; profile mutations bust it via
// revalidatePath("/u/[username]", "page") + revalidateTag(CACHE_TAGS.profiles).
export const revalidate = 3600;

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getAbsoluteUrl } from "@/lib/canonical";
import { buildProfileJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";
import { ProfilePageView } from "@/components/profile/ProfilePageView";
import { loadProfilePageProps } from "@/lib/profile/loadProfilePage";

/** Per-username cached profile fetch; busted by revalidateTag(CACHE_TAGS.profiles). */
function getCachedProfile(username: string) {
  return unstable_cache(
    () => getProfileByUsername(username),
    [`profile:username:${username}`],
    { tags: [CACHE_TAGS.profiles, `profile:${username}`], revalidate: 3600 }
  )();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);
  const profileResult = await getCachedProfile(decoded);
  const profile = profileResult.data;
  if (!profile || (profile as { is_hidden?: boolean }).is_hidden === true) return {};
  const path = `/u/${encodeURIComponent(profile.username ?? username)}`;
  const title = profile.display_name?.trim() || profile.username || "Profile";
  const description = `${title} on Archtivy. Projects, products & credits for architecture.`;
  const imageUrl = profile.avatar_url?.startsWith("http") ? profile.avatar_url : undefined;
  return {
    title,
    description,
    alternates: { canonical: getAbsoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: getAbsoluteUrl(path),
      ...(imageUrl && { images: [{ url: imageUrl, width: 200, height: 200, alt: title }] }),
    },
    twitter: {
      card: imageUrl ? "summary" : "summary_large_image",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  const profileResult = await getCachedProfile(decoded);
  const profile = profileResult.data;
  if (!profile) notFound();
  if ((profile as { is_hidden?: boolean }).is_hidden === true) notFound();

  const props = await loadProfilePageProps(profile);

  const jsonLd = buildProfileJsonLd(
    {
      display_name: profile.display_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      role: profile.role,
      bio: profile.bio,
      location_city: profile.location_city,
      location_country: profile.location_country,
      location_visibility: (profile as { location_visibility?: "public" | "private" })
        .location_visibility,
      website: profile.website,
    },
    getAbsoluteUrl(`/u/${encodeURIComponent(profile.username ?? decoded)}`)
  );

  return (
    <>
      {Object.keys(jsonLd).length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      <ProfilePageView profile={profile} {...props} />
    </>
  );
}

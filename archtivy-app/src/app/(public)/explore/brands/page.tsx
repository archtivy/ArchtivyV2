export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProfileDirectoryByRoleCached } from "@/lib/db/profileDirectory";
import { ProfileDirectoryClient } from "@/components/explore/directory/ProfileDirectoryClient";

export default async function ExploreBrandsPage() {
  const items = await getProfileDirectoryByRoleCached("brand");
  return <ProfileDirectoryClient variant="brands" items={items} />;
}

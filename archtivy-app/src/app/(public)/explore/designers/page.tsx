export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getProfileDirectoryByRoleCached } from "@/lib/db/profileDirectory";
import { ProfileDirectoryClient } from "@/components/explore/directory/ProfileDirectoryClient";

export default async function ExploreDesignersPage() {
  const items = await getProfileDirectoryByRoleCached("designer");
  return <ProfileDirectoryClient variant="designers" items={items} />;
}

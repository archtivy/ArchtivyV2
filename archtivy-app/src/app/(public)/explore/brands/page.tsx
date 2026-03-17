import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore Brands — Building Product Manufacturers | Archtivy",
  description:
    "Discover building product manufacturers and brands on Archtivy. Browse ceramics, furniture, lighting, stone, and more from the architecture network.",
  alternates: { canonical: "/explore/brands" },
};

import { getProfileDirectoryByRoleCached } from "@/lib/db/profileDirectory";
import { ProfileDirectoryClient } from "@/components/explore/directory/ProfileDirectoryClient";

export default async function ExploreBrandsPage() {
  const items = await getProfileDirectoryByRoleCached("brand");
  return <ProfileDirectoryClient variant="brands" items={items} />;
}

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Explore Designers — Architects & Design Professionals | Archtivy",
  description:
    "Discover architects, interior designers, urban designers, and design professionals on Archtivy. Browse portfolios and connect across cities.",
  alternates: { canonical: "/explore/designers" },
};

import { getProfileDirectoryByRoleCached } from "@/lib/db/profileDirectory";
import { ProfileDirectoryClient } from "@/components/explore/directory/ProfileDirectoryClient";

export default async function ExploreDesignersPage() {
  const items = await getProfileDirectoryByRoleCached("designer");
  return <ProfileDirectoryClient variant="designers" items={items} />;
}

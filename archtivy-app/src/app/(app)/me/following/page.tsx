import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getFollowingByProfile, type FollowRow } from "@/lib/db/follows";
import { supabase } from "@/lib/supabaseClient";
import { FollowingList, type FollowingItem } from "@/components/follow/FollowingList";

async function resolveProfileFollows(
  rows: FollowRow[]
): Promise<FollowingItem[]> {
  const ids = rows.map((r) => r.target_id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, role")
    .in("id", ids);
  const map = new Map(
    (data ?? []).map((p: { id: string; display_name: string | null; username: string | null; avatar_url: string | null; role: string | null }) => [p.id, p])
  );
  return rows
    .map((r) => {
      const p = map.get(r.target_id);
      if (!p) return null;
      return {
        followId: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        name: p.display_name?.trim() || p.username || "Profile",
        avatarUrl: p.avatar_url ?? null,
        href: p.username ? `/u/${p.username}` : `/u/id/${p.id}`,
        meta: p.role === "brand" ? "Brand" : "Designer",
        createdAt: r.created_at,
      } satisfies FollowingItem;
    })
    .filter(Boolean) as FollowingItem[];
}

async function resolveTaxonomyFollows(
  rows: FollowRow[],
  targetType: "category" | "material"
): Promise<FollowingItem[]> {
  const ids = rows.map((r) => r.target_id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("taxonomy_nodes")
    .select("id, label, slug_path, domain")
    .in("id", ids);
  const map = new Map(
    (data ?? []).map((n: { id: string; label: string; slug_path: string; domain: string }) => [n.id, n])
  );
  return rows
    .map((r) => {
      const n = map.get(r.target_id);
      if (!n) return null;
      const domain = n.domain as string;
      const explorePath =
        targetType === "category"
          ? domain === "product"
            ? `/explore/products?category=${encodeURIComponent(n.slug_path)}`
            : `/explore/projects?category=${encodeURIComponent(n.slug_path)}`
          : `/explore/products?material=${encodeURIComponent(n.slug_path)}`;
      return {
        followId: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        name: n.label,
        avatarUrl: null,
        href: explorePath,
        meta: targetType === "category" ? "Category" : "Material",
        createdAt: r.created_at,
      } satisfies FollowingItem;
    })
    .filter(Boolean) as FollowingItem[];
}

export default async function FollowingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) redirect("/onboarding");

  const result = await getFollowingByProfile(profile.id);
  const allFollows = result.data ?? [];

  const designerRows = allFollows.filter((r) => r.target_type === "designer");
  const brandRows = allFollows.filter((r) => r.target_type === "brand");
  const categoryRows = allFollows.filter((r) => r.target_type === "category");
  const materialRows = allFollows.filter((r) => r.target_type === "material");

  const [designers, brands, categories, materials] = await Promise.all([
    resolveProfileFollows(designerRows),
    resolveProfileFollows(brandRows),
    resolveTaxonomyFollows(categoryRows, "category"),
    resolveTaxonomyFollows(materialRows, "material"),
  ]);

  const items: FollowingItem[] = [...designers, ...brands, ...categories, ...materials];
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-100">
          Following
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Designers, brands, categories, and materials you follow.
        </p>
      </div>

      <FollowingList items={items} />
    </div>
  );
}

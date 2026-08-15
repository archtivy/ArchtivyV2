import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { ArticleForm, type TopicOption, type MentionOption } from "./ArticleForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Write an article | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * TOPIC VOCABULARY — the `discipline` taxonomy dimension.
 *
 * Blueprint §25 requires editorial content to plug into the platform's core
 * taxonomy rather than a separate CMS category list. Of the ten real domains,
 * `discipline` is the only one whose top level reads as editorial subject
 * matter: Architecture, Interior Design, Landscape Design, Urban Design,
 * Lighting Design, Sustainability Consulting, and five more — 11 real roots.
 *
 * The brief's illustrative list ("Architecture, Interiors, Design, Materials,
 * People, Sustainability, Technology") is close but not identical; the real
 * taxonomy wins, because inventing "People" and "Technology" as article-only
 * categories is exactly the separate-CMS-taxonomy the Blueprint rules out.
 */
async function getTopicOptions(): Promise<TopicOption[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("taxonomy_nodes")
    .select("id, slug_path, label")
    .eq("domain", "discipline")
    .order("label");
  if (error) {
    console.error("[add/article] topics query failed:", error.message);
    return [];
  }
  return ((data ?? []) as { id: string; slug_path: string; label: string }[])
    .filter((n) => !n.slug_path.includes("/")) // roots only
    .map((n) => ({ id: n.id, label: n.label }));
}

/**
 * Mentionable entities: real approved listings and real public profiles. The
 * whole set ships to the client because it is small (163 listings + 41
 * profiles) and the picker filters locally — same reasoning as the directory
 * pages. If the archive grows past a few thousand this becomes a search action.
 */
async function getMentionOptions(): Promise<MentionOption[]> {
  const sup = getSupabaseServiceClient();
  const [listingsRes, profilesRes] = await Promise.all([
    sup
      .from("listings")
      .select("id, title, type, location_city")
      .eq("status", "APPROVED")
      .is("deleted_at", null)
      .order("title"),
    sup
      .from("profiles")
      .select("id, display_name, username, role, location_country")
      .eq("is_hidden", false)
      .is("deleted_at", null)
      .not("username", "is", null)
      .order("display_name"),
  ]);

  const out: MentionOption[] = [];
  for (const l of (listingsRes.data ?? []) as {
    id: string;
    title: string;
    type: string;
    location_city: string | null;
  }[]) {
    out.push({
      id: l.id,
      label: l.title,
      sub: l.type === "product" ? "Product" : "Project",
      kind: "listing",
    });
  }
  for (const p of (profilesRes.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
    role: string;
  }[]) {
    if (!p.username) continue;
    out.push({
      id: p.id,
      label: p.display_name?.trim() || p.username,
      sub: p.role === "brand" ? "Brand" : "Designer",
      kind: "profile",
    });
  }
  return out;
}

export default async function AddArticlePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/add/article");

  const [topics, mentionOptions] = await Promise.all([getTopicOptions(), getMentionOptions()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <ArticleForm topics={topics} mentionOptions={mentionOptions} />
    </div>
  );
}

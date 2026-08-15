"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readTimeMinutes } from "@/lib/markdown/render";

/**
 * Article mutations as Server Actions, matching how every other entity in this
 * app is mutated (createProject, saves, claimProfile, all admin actions). No
 * REST surface is built for articles: /magazine and /magazine/[slug] are RSC +
 * ISR reading the DB directly, exactly like the four directory pages, so a
 * public API would have no consumer.
 *
 * STATE MACHINE — enforced here, server-side, never trusted from the client:
 *
 *     draft ──submit──> pending_review ──publish──> published
 *       ^                     │
 *       └──────reject─────────┘        published ──> archived
 *
 * Only a moderator can reach `published`. The author can only reach
 * `pending_review`. Every transition re-reads the row and checks ownership or
 * admin rights before writing — the status is never taken from form input.
 *
 * NOTE: articles are the only content type with a review gate. createProject
 * and createListing insert status APPROVED directly, so projects and products
 * publish unreviewed today. That inconsistency is recorded in
 * DATA_INTEGRITY_LOG.md as a product decision, not resolved here.
 */

const bodySchema = z.object({
  title: z.string().trim().min(3, "Give the article a title.").max(160),
  dek: z.string().trim().max(280).optional().default(""),
  bodyMarkdown: z.string().max(120_000).default(""),
  coverImageUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  topicNodeId: z.string().uuid().or(z.literal("")).optional().default(""),
});

export type ArticleActionResult = { ok: true; id: string; slug: string | null } | { ok: false; error: string };

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "article"
  );
}

/** Appends -2, -3 … until free. Articles are few; a scan is fine. */
async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  const sup = getSupabaseServiceClient();
  const { data } = await sup.from("articles").select("id, slug").like("slug", `${base}%`);
  const taken = new Set(
    ((data ?? []) as { id: string; slug: string | null }[])
      .filter((r) => r.id !== excludeId && r.slug)
      .map((r) => r.slug as string)
  );
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

async function currentProfile() {
  const { userId } = await auth();
  if (!userId) return null;
  const result = await getProfileByClerkId(userId);
  return (result?.data ?? null) as { id: string; is_admin?: boolean } | null;
}

async function isAdmin(): Promise<boolean> {
  const { sessionClaims } = await auth();
  const claims = sessionClaims as
    | { publicMetadata?: { isAdmin?: boolean }; metadata?: { role?: string } }
    | undefined;
  if (claims?.publicMetadata?.isAdmin === true) return true;
  if (claims?.metadata?.role === "admin") return true;
  const profile = await currentProfile();
  return profile?.is_admin === true;
}

function bust(slug?: string | null) {
  revalidateTag(CACHE_TAGS.articles);
  revalidatePath("/magazine");
  if (slug) revalidatePath(`/magazine/${slug}`);
}

/** Create or update a draft. Only the author, and only while editable. */
export async function saveArticleDraft(
  articleId: string | null,
  input: unknown
): Promise<ArticleActionResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in to write an article." };

  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const v = parsed.data;
  const sup = getSupabaseServiceClient();

  const payload = {
    title: v.title,
    dek: v.dek || null,
    body_md: v.bodyMarkdown,
    cover_image_url: v.coverImageUrl || null,
    topic_node_id: v.topicNodeId || null,
    // Derived on every write, never accepted from the client.
    read_time_minutes: readTimeMinutes(v.bodyMarkdown),
  };

  if (!articleId) {
    const { data, error } = await sup
      .from("articles")
      .insert({ ...payload, author_profile_id: profile.id, status: "draft" })
      .select("id, slug")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: (data as { id: string }).id, slug: null };
  }

  const { data: existing, error: readErr } = await sup
    .from("articles")
    .select("id, author_profile_id, status, slug")
    .eq("id", articleId)
    .maybeSingle();
  if (readErr || !existing) return { ok: false, error: "Article not found." };

  // author_profile_id is nullable since the 20260806 migration (profile delete
  // sets it null rather than cascading the article away). A null author can
  // never equal a signed-in profile id, so this check fails closed.
  const row = existing as { author_profile_id: string | null; status: string; slug: string | null };
  if (row.author_profile_id !== profile.id) {
    return { ok: false, error: "This is not your article." };
  }
  if (row.status !== "draft" && row.status !== "rejected") {
    return { ok: false, error: "Articles can only be edited while in draft." };
  }

  const { error } = await sup.from("articles").update(payload).eq("id", articleId);
  if (error) return { ok: false, error: error.message };
  bust(row.slug);
  return { ok: true, id: articleId, slug: row.slug };
}

/** Author action. Moves draft -> pending_review. Never straight to published. */
export async function submitArticleForReview(articleId: string): Promise<ArticleActionResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };

  const sup = getSupabaseServiceClient();
  const { data, error: readErr } = await sup
    .from("articles")
    .select("id, author_profile_id, status, title, body_md, slug")
    .eq("id", articleId)
    .maybeSingle();
  if (readErr || !data) return { ok: false, error: "Article not found." };

  const row = data as {
    author_profile_id: string | null;
    status: string;
    title: string;
    body_md: string;
    slug: string | null;
  };
  if (row.author_profile_id !== profile.id) return { ok: false, error: "This is not your article." };
  if (row.status !== "draft" && row.status !== "rejected") {
    return { ok: false, error: "Already submitted." };
  }
  if (!row.title.trim() || row.body_md.trim().length < 200) {
    return { ok: false, error: "Write a bit more before submitting — at least a few paragraphs." };
  }

  const { error } = await sup
    .from("articles")
    .update({ status: "pending_review", review_note: null })
    .eq("id", articleId);
  if (error) return { ok: false, error: error.message };
  revalidateTag(CACHE_TAGS.articles);
  return { ok: true, id: articleId, slug: row.slug };
}

/** Moderator action. The ONLY path to `published`. */
export async function publishArticle(articleId: string): Promise<ArticleActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
  const reviewer = await currentProfile();

  const sup = getSupabaseServiceClient();
  const { data, error: readErr } = await sup
    .from("articles")
    .select("id, title, slug, status")
    .eq("id", articleId)
    .maybeSingle();
  if (readErr || !data) return { ok: false, error: "Article not found." };

  const row = data as { title: string; slug: string | null; status: string };
  if (row.status !== "pending_review") {
    return { ok: false, error: "Only articles in review can be published." };
  }

  const slug = row.slug ?? (await uniqueSlug(slugify(row.title), articleId));
  const { error } = await sup
    .from("articles")
    .update({
      status: "published",
      slug,
      published_at: new Date().toISOString(),
      reviewed_by_profile_id: reviewer?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", articleId);
  if (error) return { ok: false, error: error.message };
  bust(slug);
  return { ok: true, id: articleId, slug };
}

/** Moderator action. Returns the article to the author with a note. */
export async function rejectArticle(
  articleId: string,
  note: string
): Promise<ArticleActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
  const reviewer = await currentProfile();
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Give the author a reason." };

  const sup = getSupabaseServiceClient();
  const { error } = await sup
    .from("articles")
    .update({
      status: "rejected",
      review_note: trimmed.slice(0, 2000),
      reviewed_by_profile_id: reviewer?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", articleId)
    .eq("status", "pending_review");
  if (error) return { ok: false, error: error.message };
  revalidateTag(CACHE_TAGS.articles);
  return { ok: true, id: articleId, slug: null };
}

/** Moderator action. Feature flag for the index's Featured Stories row. */
export async function setArticleFeatured(
  articleId: string,
  featured: boolean
): Promise<ArticleActionResult> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorised." };
  const sup = getSupabaseServiceClient();
  const { error } = await sup
    .from("articles")
    .update({ is_featured: featured })
    .eq("id", articleId)
    .eq("status", "published");
  if (error) return { ok: false, error: error.message };
  bust();
  return { ok: true, id: articleId, slug: null };
}

/**
 * Relationship mutation, kept separate from the scalar draft save — related
 * entities are first-class rows, not a field on the article.
 * `target` is a listing id or a profile id; the column is chosen here rather
 * than trusted from the client.
 */
export async function setArticleRelatedEntities(
  articleId: string,
  targets: { kind: "listing" | "profile"; id: string }[]
): Promise<ArticleActionResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };

  const sup = getSupabaseServiceClient();
  const { data, error: readErr } = await sup
    .from("articles")
    .select("id, author_profile_id, status, slug")
    .eq("id", articleId)
    .maybeSingle();
  if (readErr || !data) return { ok: false, error: "Article not found." };
  const row = data as { author_profile_id: string | null; status: string; slug: string | null };
  if (row.author_profile_id !== profile.id && !(await isAdmin())) {
    return { ok: false, error: "This is not your article." };
  }

  await sup.from("article_related_entities").delete().eq("article_id", articleId);

  const rows = targets.slice(0, 12).map((t, i) => ({
    article_id: articleId,
    listing_id: t.kind === "listing" ? t.id : null,
    profile_id: t.kind === "profile" ? t.id : null,
    sort_order: i,
  }));
  if (rows.length > 0) {
    const { error } = await sup.from("article_related_entities").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  bust(row.slug);
  return { ok: true, id: articleId, slug: row.slug };
}

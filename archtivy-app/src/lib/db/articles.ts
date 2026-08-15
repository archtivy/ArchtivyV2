/**
 * Magazine data layer.
 *
 * REAL-CONTENT NOTE: at the time of writing there are ZERO real articles. Every
 * function here is written to return honestly empty results, and the index page
 * renders a real empty state rather than seeded placeholder content. Nothing in
 * this file invents an article, an author or a topic.
 *
 * FAILS SOFT ON A MISSING TABLE. The migration is prepared but not yet applied,
 * so `articles` may not exist. A missing relation (PostgREST 42P01) is treated
 * as "no articles yet" rather than a thrown error, so /magazine renders its
 * empty state on an un-migrated database instead of 500-ing.
 *
 * RELATED ENTITIES: article_related_entities carries real FKs to `listings` and
 * `profiles` (see the migration for why the spec's polymorphic entityType /
 * entityId pair was rejected), so these embeds are FK-backed and cannot fail
 * the silent way project_material_links did.
 */

import { unstable_cache } from "next/cache";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { excerptFrom } from "@/lib/markdown/render";

export const ARTICLE_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "archived",
] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface ArticleAuthor {
  id: string;
  name: string;
  /** Null when the author profile has no username — byline stays unlinked. */
  href: string | null;
  avatarUrl: string | null;
}

export interface ArticleSummary {
  id: string;
  slug: string;
  href: string;
  title: string;
  dek: string | null;
  cover: string | null;
  topic: string | null;
  topicSlug: string | null;
  author: ArticleAuthor | null;
  publishedAt: string | null;
  readTimeMinutes: number;
  isFeatured: boolean;
}

export interface ArticleRelatedEntity {
  id: string;
  kind: "project" | "product" | "professional" | "brand";
  title: string;
  href: string;
  cover: string | null;
  subtitle: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  bodyMarkdown: string;
  related: ArticleRelatedEntity[];
  relatedArticles: ArticleSummary[];
}

export interface MagazineTopic {
  slug: string;
  label: string;
  count: number;
}

export interface MagazineIndex {
  featured: ArticleSummary[];
  latest: ArticleSummary[];
  topics: MagazineTopic[];
  total: number;
}

const EMPTY_INDEX: MagazineIndex = { featured: [], latest: [], topics: [], total: 0 };

/** PostgREST code for "relation does not exist". */
const UNDEFINED_TABLE = "42P01";

type TopicNode = { slug_path: string; label: string } | { slug_path: string; label: string }[] | null;
type ProfileRef =
  | { id: string; display_name: string | null; username: string | null; avatar_url: string | null }
  | { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]
  | null;

type ArticleRow = {
  id: string;
  slug: string | null;
  title: string;
  dek: string | null;
  body_md: string;
  cover_image_url: string | null;
  published_at: string | null;
  read_time_minutes: number;
  is_featured: boolean;
  taxonomy_nodes: TopicNode;
  profiles: ProfileRef;
};

const ARTICLE_SELECT =
  "id, slug, title, dek, body_md, cover_image_url, published_at, read_time_minutes, is_featured, " +
  "taxonomy_nodes:topic_node_id(slug_path, label), " +
  "profiles:author_profile_id(id, display_name, username, avatar_url)";

const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

function toSummary(r: ArticleRow): ArticleSummary | null {
  if (!r.slug) return null;
  const topic = one(r.taxonomy_nodes);
  const p = one(r.profiles);
  return {
    id: r.id,
    slug: r.slug,
    href: `/magazine/${r.slug}`,
    title: r.title,
    dek: r.dek?.trim() || excerptFrom(r.body_md) || null,
    cover: r.cover_image_url,
    topic: topic?.label ?? null,
    topicSlug: topic?.slug_path ?? null,
    author: p
      ? {
          id: p.id,
          name: p.display_name?.trim() || p.username || "Archtivy",
          href: p.username ? `/u/${encodeURIComponent(p.username)}` : null,
          avatarUrl: p.avatar_url,
        }
      : null,
    publishedAt: r.published_at,
    readTimeMinutes: r.read_time_minutes,
    isFeatured: r.is_featured,
  };
}

async function fetchMagazineIndex(): Promise<MagazineIndex> {
  const sup = getSupabaseServiceClient();

  const { data, error } = await sup
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) {
    if (error.code !== UNDEFINED_TABLE) {
      console.error("[articles] index query failed:", error.message);
    }
    return EMPTY_INDEX;
  }

  const rows = (data ?? []) as unknown as ArticleRow[];
  const all = rows.map(toSummary).filter((a): a is ArticleSummary => a !== null);

  // Topics: only those with >= 1 real published article, same measure-first
  // discipline as every directory rail.
  const counts = new Map<string, { label: string; count: number }>();
  for (const a of all) {
    if (!a.topicSlug || !a.topic) continue;
    const prev = counts.get(a.topicSlug);
    counts.set(a.topicSlug, { label: a.topic, count: (prev?.count ?? 0) + 1 });
  }

  return {
    // Up to 4, and only what is genuinely flagged — never padded to fill the row.
    featured: all.filter((a) => a.isFeatured).slice(0, 4),
    latest: all,
    topics: [...counts.entries()]
      .map(([slug, v]) => ({ slug, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    total: all.length,
  };
}

export const getMagazineIndex = unstable_cache(fetchMagazineIndex, ["magazine:index:v1"], {
  tags: [CACHE_TAGS.articles],
  revalidate: 3600,
});

/** Slugs for generateStaticParams. Empty until the table exists and has rows. */
export async function getPublishedArticleSlugs(): Promise<string[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("articles")
    .select("slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .not("slug", "is", null);
  if (error) return [];
  return ((data ?? []) as { slug: string | null }[])
    .map((r) => r.slug)
    .filter((s): s is string => Boolean(s));
}

async function fetchArticle(slug: string): Promise<ArticleDetail | null> {
  const sup = getSupabaseServiceClient();

  const { data, error } = await sup
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) {
    if (error && error.code !== UNDEFINED_TABLE) {
      console.error("[articles] detail query failed:", error.message);
    }
    return null;
  }

  const row = data as unknown as ArticleRow;
  const summary = toSummary(row);
  if (!summary) return null;

  // ── Related entities, both FK-backed ─────────────────────────────────────
  const { data: relData, error: relErr } = await sup
    .from("article_related_entities")
    .select(
      "id, sort_order, " +
        "listings:listing_id(id, type, slug, title, cover_image_url, location_city, owner_profile_id), " +
        "profiles:profile_id(id, role, display_name, username, avatar_url, location_country)"
    )
    .eq("article_id", row.id)
    .order("sort_order", { ascending: true });

  if (relErr) console.error("[articles] related query failed:", relErr.message);

  type RelRow = {
    id: string;
    listings:
      | { id: string; type: string; slug: string | null; title: string; cover_image_url: string | null; location_city: string | null }
      | { id: string; type: string; slug: string | null; title: string; cover_image_url: string | null; location_city: string | null }[]
      | null;
    profiles:
      | { id: string; role: string; display_name: string | null; username: string | null; avatar_url: string | null; location_country: string | null }
      | { id: string; role: string; display_name: string | null; username: string | null; avatar_url: string | null; location_country: string | null }[]
      | null;
  };

  const related: ArticleRelatedEntity[] = [];
  for (const r of (relData ?? []) as unknown as RelRow[]) {
    const l = one(r.listings);
    if (l && l.slug) {
      related.push({
        id: l.id,
        kind: l.type === "product" ? "product" : "project",
        title: l.title,
        href: `/${l.type === "product" ? "products" : "projects"}/${l.slug}`,
        cover: l.cover_image_url,
        subtitle: l.location_city,
      });
      continue;
    }
    const p = one(r.profiles);
    if (p && p.username) {
      related.push({
        id: p.id,
        kind: p.role === "brand" ? "brand" : "professional",
        title: p.display_name?.trim() || p.username,
        href: `/u/${encodeURIComponent(p.username)}`,
        cover: p.avatar_url,
        subtitle: p.location_country,
      });
    }
  }

  // ── Related articles: same topic, most recent, excluding this one ────────
  let relatedArticles: ArticleSummary[] = [];
  if (row.slug) {
    const { data: sameTopic } = await sup
      .from("articles")
      .select(ARTICLE_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("id", row.id)
      .order("published_at", { ascending: false })
      .limit(12);

    const candidates = ((sameTopic ?? []) as unknown as ArticleRow[])
      .map(toSummary)
      .filter((a): a is ArticleSummary => a !== null);
    const sameTopicOnly = summary.topicSlug
      ? candidates.filter((a) => a.topicSlug === summary.topicSlug)
      : [];
    // Same topic first; fall back to most recent so the slot is never empty
    // when other articles exist. No similarity score, no AI.
    relatedArticles = (sameTopicOnly.length > 0 ? sameTopicOnly : candidates).slice(0, 3);
  }

  return { ...summary, bodyMarkdown: row.body_md, related, relatedArticles };
}

export function getArticle(slug: string) {
  return unstable_cache(() => fetchArticle(slug), ["magazine:article", slug], {
    tags: [CACHE_TAGS.articles],
    revalidate: 3600,
  })();
}

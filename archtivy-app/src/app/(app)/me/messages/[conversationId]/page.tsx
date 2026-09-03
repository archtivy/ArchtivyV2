import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import {
  getConversationForParticipant,
  markConversationRead,
} from "@/lib/db/conversations";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Message | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/messages/[conversationId] — one thread, read-only.
 *
 * ── AUTHORIZATION ───────────────────────────────────────────────────────────
 * getConversationForParticipant takes the VIEWER'S profile id and checks
 * conversation_participants before it reads anything else; a non-participant
 * gets null and therefore notFound(), which is the same response a nonexistent
 * id gives. So changing the uuid in the URL reveals neither another person's
 * thread nor whether that thread exists.
 *
 * This matters more than usual here: these tables carry RLS with no policy and
 * every read goes through the service role, which bypasses RLS entirely. The
 * membership check IS the authorization — there is no policy underneath it to
 * catch a mistake.
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=/me/messages/${conversationId}`);

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data as { id: string } | null;
  if (!profile?.id) notFound();

  const { data: thread } = await getConversationForParticipant(conversationId, profile.id);
  if (!thread) notFound();

  /* Opening the thread is what marks it read — for THIS participant only. */
  await markConversationRead(conversationId, profile.id);

  const counterpart = thread.participants.find((p) => p.profileId !== profile.id) ?? null;

  /* Product context is fetched by id, not copied into the message. */
  let product: {
    title: string;
    brand: string | null;
    cover: string | null;
    href: string | null;
  } | null = null;

  if (thread.subjectListingId) {
    const sup = getSupabaseServiceClient();
    const [{ data: listingRow }, { data: taxRow }] = await Promise.all([
      sup
        .from("listings")
        .select("id, slug, title, type, cover_image_url, owner_profile_id")
        .eq("id", thread.subjectListingId)
        .maybeSingle(),
      sup
        .from("listing_taxonomy_node")
        .select("taxonomy_nodes:taxonomy_node_id(slug_path, domain)")
        .eq("listing_id", thread.subjectListingId)
        .eq("is_primary", true)
        .maybeSingle(),
    ]);

    const listing = listingRow as {
      id: string;
      slug: string | null;
      title: string | null;
      type: string | null;
      cover_image_url: string | null;
      owner_profile_id: string | null;
    } | null;

    if (listing) {
      const node = (taxRow as { taxonomy_nodes?: { slug_path?: string; domain?: string } } | null)
        ?.taxonomy_nodes;
      const kind = listing.type === "project" ? "project" : "product";
      let brand: string | null = null;
      if (listing.owner_profile_id) {
        const { data: b } = await sup
          .from("profiles")
          .select("display_name, username")
          .eq("id", listing.owner_profile_id)
          .maybeSingle();
        const row = b as { display_name: string | null; username: string | null } | null;
        brand = row?.display_name?.trim() || row?.username || null;
      }
      product = {
        title: listing.title?.trim() || "Product",
        brand,
        cover: listing.cover_image_url,
        // Canonical nested URL, via the same builder the cards use.
        href: getListingUrl({
          id: listing.id,
          type: kind,
          slug: listing.slug,
          taxonomySlugPath: node?.domain === kind ? (node?.slug_path ?? null) : null,
        }),
      };
    }
  }

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
  };

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <Link
        href="/me/messages"
        className="inline-flex items-center gap-1.5 font-body text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft strokeWidth={1.5} className="h-3.5 w-3.5" aria-hidden />
        Messages
      </Link>

      {thread.contextType === "product_request" && (
        <p className="mt-5 font-body text-[11px] uppercase tracking-[0.12em] text-muted">
          Product request
        </p>
      )}

      <h1 className="mt-2 font-display text-[26px] leading-[1.15] tracking-tight text-ink">
        {counterpart?.name ?? "Conversation"}
      </h1>

      {product && (
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-hairline bg-white p-4">
          {product.cover ? (
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone/40">
              <Image src={product.cover} alt="" fill sizes="56px" className="object-cover" />
            </span>
          ) : (
            <span className="h-14 w-14 shrink-0 rounded-lg bg-stone/40" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-body text-[14px] text-ink">{product.title}</p>
            {product.brand && (
              <p className="truncate font-body text-[13px] text-muted">{product.brand}</p>
            )}
          </div>
          {product.href && (
            <Link
              href={product.href}
              className="shrink-0 font-body text-[13px] text-ink underline-offset-4 hover:underline"
            >
              View product →
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {thread.messages.map((m) => {
          const author = thread.participants.find((p) => p.profileId === m.senderProfileId);
          return (
            <article key={m.id} className="rounded-xl border border-hairline bg-white p-5">
              <header className="flex items-center gap-2.5">
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-stone/40">
                  {author?.avatarUrl && (
                    <Image
                      src={author.avatarUrl}
                      alt=""
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-body text-[13px] text-ink">
                    {author?.name ?? "Archtivy member"}
                  </span>
                  <span className="block font-body text-[12px] text-muted">
                    {fmt(m.createdAt)}
                  </span>
                </span>
              </header>
              {/* Exactly as submitted — line breaks preserved, nothing clamped. */}
              <p className="mt-4 whitespace-pre-wrap font-body text-[14px] leading-[22px] text-ink">
                {m.body}
              </p>
            </article>
          );
        })}
      </div>

      {/* No composer in V1. Saying so is better than a disabled box. */}
      <p className="mt-6 font-body text-[13px] text-muted">
        Replies aren&rsquo;t available yet — you can reach{" "}
        {counterpart?.name ?? "the sender"} directly from their profile.
      </p>
    </div>
  );
}

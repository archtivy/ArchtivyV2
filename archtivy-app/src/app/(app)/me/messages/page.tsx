import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { listConversationsForProfile } from "@/lib/db/conversations";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Messages | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/messages — the inbox.
 *
 * ── V1 IS READ-ONLY ─────────────────────────────────────────────────────────
 * A list and a thread. No composer, no attachments, no realtime, no search, no
 * archive. The only thing that creates a conversation today is an approved
 * product request, so a reply box would be a control with nowhere to send.
 *
 * Until this existed the page was an honest empty state whose comment recorded
 * that no message table existed at all. It does now — see migration
 * 20260902100000.
 */
export default async function MessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/messages");

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data as { id: string } | null;

  const conversations = profile?.id
    ? ((await listConversationsForProfile(profile.id)).data ?? [])
    : [];

  /* One query for every subject product, rather than one per row. Product
     data is fetched by id and never copied into the message. */
  const listingIds = Array.from(
    new Set(conversations.map((c) => c.subjectListingId).filter(Boolean) as string[])
  );
  const listings = new Map<string, { title: string | null }>();
  if (listingIds.length > 0) {
    const { data } = await getSupabaseServiceClient()
      .from("listings")
      .select("id, title")
      .in("id", listingIds);
    for (const l of (data ?? []) as { id: string; title: string | null }[]) {
      listings.set(l.id, { title: l.title });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">Messages</h1>
      <p className="mt-2 font-body text-[15px] text-muted">
        Requests and conversations from across Archtivy.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-7 flex min-h-[420px] items-center justify-center rounded-xl border border-hairline bg-white px-6 py-16">
          <div className="text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone/40">
              <MessageSquare strokeWidth={1.5} className="h-5 w-5 text-muted" aria-hidden />
            </span>
            <p className="mt-4 font-display text-[20px] leading-none tracking-tight text-ink">
              No messages yet
            </p>
            <p className="mx-auto mt-2.5 max-w-[380px] font-body text-[14px] leading-[20px] text-muted">
              Requests about your products appear here once our team has reviewed them.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-7 overflow-hidden rounded-xl border border-hairline bg-white">
          {conversations.map((c, i) => {
            const subject = c.subjectListingId ? listings.get(c.subjectListingId) : null;
            return (
              <li key={c.id} className={i > 0 ? "border-t border-hairline" : ""}>
                <Link
                  href={`/me/messages/${c.id}`}
                  className="flex gap-4 px-5 py-4 transition-colors hover:bg-stone/20"
                >
                  <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full bg-stone/40">
                    {c.counterpart.avatarUrl && (
                      <Image
                        src={c.counterpart.avatarUrl}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span
                        className={[
                          "font-body text-[14px] text-ink",
                          c.unread ? "font-semibold" : "",
                        ].join(" ")}
                      >
                        {c.counterpart.name}
                      </span>
                      {/* PRODUCT REQUEST, never "Lead" — internal sales
                          vocabulary does not belong on a brand's inbox. */}
                      {c.contextType === "product_request" && (
                        <span className="rounded-full border border-hairline bg-stone/30 px-2 py-0.5 font-body text-[10px] uppercase tracking-[0.1em] text-muted">
                          Product request
                        </span>
                      )}
                    </span>

                    {subject?.title && (
                      <span className="mt-0.5 block truncate font-body text-[13px] text-muted">
                        {subject.title}
                      </span>
                    )}

                    <span className="mt-1 block truncate font-body text-[13px] text-muted">
                      {c.preview}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-body text-[12px] text-muted">
                      {new Date(c.lastMessageAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {c.unread && (
                      <span
                        className="h-2 w-2 rounded-full bg-archtivy-primary"
                        aria-label="Unread"
                      />
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

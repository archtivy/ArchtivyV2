import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Messages | Archtivy",
  robots: { index: false, follow: false },
};

/**
 * /me/messages — a real empty state, and nothing behind it.
 *
 * ── THERE IS NO MESSAGING SYSTEM ────────────────────────────────────────────
 * Audited 2026-08-31: no messages, conversations, threads or inbox table
 * exists, and no code writes one. This page therefore creates no tables, no
 * API, no realtime channel and no message records. It is the sidebar
 * destination and an honest statement that the feature is not built.
 *
 * ── LEADS ARE NOT MESSAGES ──────────────────────────────────────────────────
 * The public profile's "Message" button and the product Request Quote form
 * both write to `leads` — a one-way enquiry captured against a LISTING, with a
 * sender name and email and a review status. That is a contact form, not a
 * conversation: there is no reply, no thread and no participant model. Folding
 * leads into an inbox would make two unrelated things look like one, so this
 * page points at them and keeps them named as what they are.
 *
 * No two-column inbox skeleton is drawn either. An empty sidebar beside an
 * empty pane advertises a feature that is not coming in this change; a single
 * centred statement does not.
 */
export default async function MessagesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/me/messages");

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="font-display text-[30px] leading-[1.1] tracking-tight text-ink">Messages</h1>
      <p className="mt-2 font-body text-[15px] text-muted">
        Conversations with designers, brands and collaborators.
      </p>

      <div className="mt-7 flex min-h-[420px] items-center justify-center rounded-xl border border-hairline bg-white px-6 py-16">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone/40">
            <MessageSquare strokeWidth={1.5} className="h-5 w-5 text-muted" aria-hidden />
          </span>
          <p className="mt-4 font-display text-[20px] leading-none tracking-tight text-ink">
            No messages yet
          </p>
          <p className="mx-auto mt-2.5 max-w-[380px] font-body text-[14px] leading-[20px] text-muted">
            Messages from designers, brands, and collaborators will appear here.
          </p>
          <p className="mx-auto mt-6 max-w-[420px] font-body text-[13px] leading-[19px] text-muted">
            Enquiries sent through your listings are handled separately as{" "}
            <Link
              href="/me/listings"
              className="text-ink underline-offset-4 hover:underline"
            >
              listing leads
            </Link>
            , and arrive by email.
          </p>
        </div>
      </div>
    </div>
  );
}

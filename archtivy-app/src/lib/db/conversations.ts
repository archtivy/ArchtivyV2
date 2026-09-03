import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Conversations, participants and messages.
 *
 * ── AUTHORIZATION IS NOT HERE ───────────────────────────────────────────────
 * Every function on this module uses the SERVICE ROLE, which bypasses RLS.
 * That is deliberate — the tables carry RLS with no policy, so anon reads
 * nothing and all access is intermediated. The consequence is that "may this
 * person read this thread" is an APPLICATION question, answered by
 * getConversationForParticipant below, which takes the viewer's profile id and
 * refuses to return a thread they are not a participant of. Nothing else in
 * this file checks anything; callers must go through that door.
 */

export type DbResult<T> = { data: T; error: null } | { data: null; error: string };

export type ConversationContext = "general" | "product_request";

export interface ConversationSummary {
  id: string;
  contextType: ConversationContext;
  subjectListingId: string | null;
  lastMessageAt: string;
  /** The other participant, from the viewer's point of view. */
  counterpart: {
    profileId: string | null;
    name: string;
    username: string | null;
    avatarUrl: string | null;
  };
  preview: string;
  unread: boolean;
}

export interface ConversationThread {
  id: string;
  contextType: ConversationContext;
  subjectListingId: string | null;
  createdAt: string;
  viewerRole: "sender" | "recipient";
  participants: {
    profileId: string;
    role: "sender" | "recipient";
    name: string;
    username: string | null;
    avatarUrl: string | null;
  }[];
  messages: { id: string; senderProfileId: string | null; body: string; createdAt: string }[];
}

interface ProfileLite {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const nameOf = (p: ProfileLite | undefined): string =>
  p?.display_name?.trim() || p?.username?.trim() || "Archtivy member";

async function loadProfiles(ids: string[]): Promise<Map<string, ProfileLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return new Map();
  const { data } = await getSupabaseServiceClient()
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", unique);
  return new Map(((data ?? []) as ProfileLite[]).map((p) => [p.id, p]));
}

/**
 * Every conversation this profile participates in, newest activity first.
 *
 * Unread is derived, never stored: the latest message is newer than this
 * participant's last_read_at. A message the viewer sent themselves can never
 * mark their own thread unread.
 */
export async function listConversationsForProfile(
  profileId: string
): Promise<DbResult<ConversationSummary[]>> {
  const sup = getSupabaseServiceClient();

  const { data: memberships, error: mErr } = await sup
    .from("conversation_participants")
    .select("conversation_id, role, last_read_at")
    .eq("profile_id", profileId);
  if (mErr) return { data: null, error: mErr.message };

  const rows = (memberships ?? []) as {
    conversation_id: string;
    role: "sender" | "recipient";
    last_read_at: string | null;
  }[];
  if (rows.length === 0) return { data: [], error: null };

  const convIds = rows.map((r) => r.conversation_id);
  const readAt = new Map(rows.map((r) => [r.conversation_id, r.last_read_at]));

  const [{ data: convs, error: cErr }, { data: others }, { data: msgs }] = await Promise.all([
    sup
      .from("conversations")
      .select("id, context_type, subject_listing_id, last_message_at")
      .in("id", convIds)
      .order("last_message_at", { ascending: false }),
    sup
      .from("conversation_participants")
      .select("conversation_id, profile_id")
      .in("conversation_id", convIds)
      .neq("profile_id", profileId),
    sup
      .from("messages")
      .select("conversation_id, sender_profile_id, body, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true }),
  ]);
  if (cErr) return { data: null, error: cErr.message };

  const counterpartId = new Map(
    ((others ?? []) as { conversation_id: string; profile_id: string }[]).map((o) => [
      o.conversation_id,
      o.profile_id,
    ])
  );

  /* Last message per conversation, and whether it is newer than last_read_at.
     Ordered ascending above, so the last write per key wins. */
  const last = new Map<string, { body: string; createdAt: string; senderId: string | null }>();
  for (const m of (msgs ?? []) as {
    conversation_id: string;
    sender_profile_id: string | null;
    body: string;
    created_at: string;
  }[]) {
    last.set(m.conversation_id, {
      body: m.body,
      createdAt: m.created_at,
      senderId: m.sender_profile_id,
    });
  }

  const profiles = await loadProfiles(Array.from(counterpartId.values()));

  const summaries: ConversationSummary[] = (
    (convs ?? []) as {
      id: string;
      context_type: ConversationContext;
      subject_listing_id: string | null;
      last_message_at: string;
    }[]
  ).map((c) => {
    const otherId = counterpartId.get(c.id) ?? null;
    const other = otherId ? profiles.get(otherId) : undefined;
    const lastMsg = last.get(c.id);
    const seenAt = readAt.get(c.id) ?? null;
    return {
      id: c.id,
      contextType: c.context_type,
      subjectListingId: c.subject_listing_id,
      lastMessageAt: c.last_message_at,
      counterpart: {
        profileId: otherId,
        name: nameOf(other),
        username: other?.username ?? null,
        avatarUrl: other?.avatar_url ?? null,
      },
      preview: lastMsg?.body ?? "",
      unread: Boolean(
        lastMsg &&
          lastMsg.senderId !== profileId &&
          (!seenAt || new Date(lastMsg.createdAt) > new Date(seenAt))
      ),
    };
  });

  return { data: summaries, error: null };
}

/**
 * One thread, ONLY if this profile is a participant.
 *
 * The membership row is fetched first and a miss returns null — so changing
 * the id in the URL yields the same not-found a nonexistent conversation does,
 * and no part of another person's thread is loaded before the check. This is
 * the single authorization gate for reading a conversation.
 */
export async function getConversationForParticipant(
  conversationId: string,
  viewerProfileId: string
): Promise<DbResult<ConversationThread | null>> {
  const sup = getSupabaseServiceClient();

  const { data: membership, error: memErr } = await sup
    .from("conversation_participants")
    .select("role")
    .eq("conversation_id", conversationId)
    .eq("profile_id", viewerProfileId)
    .maybeSingle();
  if (memErr) return { data: null, error: memErr.message };
  if (!membership) return { data: null, error: null };

  const { data: conv, error: cErr } = await sup
    .from("conversations")
    .select("id, context_type, subject_listing_id, created_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (cErr) return { data: null, error: cErr.message };
  if (!conv) return { data: null, error: null };

  const [{ data: parts }, { data: msgs }] = await Promise.all([
    sup
      .from("conversation_participants")
      .select("profile_id, role")
      .eq("conversation_id", conversationId),
    sup
      .from("messages")
      .select("id, sender_profile_id, body, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ]);

  const partRows = (parts ?? []) as { profile_id: string; role: "sender" | "recipient" }[];
  const profiles = await loadProfiles(partRows.map((p) => p.profile_id));

  const c = conv as {
    id: string;
    context_type: ConversationContext;
    subject_listing_id: string | null;
    created_at: string;
  };

  return {
    data: {
      id: c.id,
      contextType: c.context_type,
      subjectListingId: c.subject_listing_id,
      createdAt: c.created_at,
      viewerRole: (membership as { role: "sender" | "recipient" }).role,
      participants: partRows.map((p) => {
        const prof = profiles.get(p.profile_id);
        return {
          profileId: p.profile_id,
          role: p.role,
          name: nameOf(prof),
          username: prof?.username ?? null,
          avatarUrl: prof?.avatar_url ?? null,
        };
      }),
      messages: (
        (msgs ?? []) as {
          id: string;
          sender_profile_id: string | null;
          body: string;
          created_at: string;
        }[]
      ).map((m) => ({
        id: m.id,
        senderProfileId: m.sender_profile_id,
        body: m.body,
        createdAt: m.created_at,
      })),
    },
    error: null,
  };
}

/** Stamp last_read_at. Scoped to the one membership row, so it cannot touch another participant's state. */
export async function markConversationRead(
  conversationId: string,
  profileId: string
): Promise<void> {
  await getSupabaseServiceClient()
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("profile_id", profileId);
}

/** Unread thread count for the workspace, derived the same way the list is. */
export async function countUnreadConversations(profileId: string): Promise<number> {
  const res = await listConversationsForProfile(profileId);
  if (!res.data) return 0;
  return res.data.filter((c) => c.unread).length;
}

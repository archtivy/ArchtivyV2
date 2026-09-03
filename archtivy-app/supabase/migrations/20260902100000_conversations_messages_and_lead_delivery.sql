-- ============================================================================
-- Conversations, messages, and the lead -> inbox links
--
-- Purely ADDITIVE. Three new tables, four new columns, two indexes, one
-- partial unique index. Nothing dropped, nothing renamed, no backfill. Every
-- existing lead column keeps its meaning and its data.
--
-- ── WHY NEW TABLES ──────────────────────────────────────────────────────────
-- There is no message, conversation, thread or inbox table in this database —
-- verified 2026-08-31 and again 2026-09-02. /me/messages is an empty state
-- with nothing behind it. `leads` carries `listing_owner_email`, a text
-- snapshot of an address: it can address an email client, and it cannot
-- address an inbox, express a participant, carry read state or be threaded.
-- Delivering an approved lead in-app therefore needs a model that does not
-- exist yet. The alternative — a lead-only inbox — is explicitly not wanted.
-- ============================================================================

create table if not exists public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  /*
   * What this conversation is ABOUT, as a column rather than an inference.
   *
   * The UI needs to know a thread is a product request in order to draw the
   * PRODUCT REQUEST badge and the product context block. Deriving that from
   * "subject_listing_id is not null" would be wrong the moment a general
   * conversation acquires a listing subject, and parsing the message text for
   * it would be worse. A future kind is one CHECK value away.
   */
  context_type       text not null default 'general'
    check (context_type in ('general', 'product_request')),
  subject_listing_id uuid references public.listings(id) on delete set null,
  created_at         timestamptz not null default now(),
  last_message_at    timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id)      on delete cascade,
  role            text not null check (role in ('sender', 'recipient')),
  /*
   * Read state lives here and only here. A denormalised unread counter would
   * be a second copy of a fact derivable from max(messages.created_at), and
   * the two would drift the first time a write failed halfway.
   */
  last_read_at    timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  /* Nullable so deleting a profile does not delete the thread's history. */
  sender_profile_id uuid references public.profiles(id) on delete set null,
  body              text not null,
  created_at        timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists conversation_participants_profile_idx
  on public.conversation_participants (profile_id);

/*
 * ── RLS ON, NO POLICY ───────────────────────────────────────────────────────
 * Anon sees zero rows. Every read goes through the service role behind an
 * application membership check, which is the same posture document_downloads
 * uses. This is deliberate: authorization for a thread is "is the signed-in
 * user's profile a participant", and that question is answered in the route,
 * not in a policy that the service role bypasses anyway.
 */
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;


-- ── leads: the three links it has never had ─────────────────────────────────
-- requester_profile_id  who actually sent it, resolved from the Clerk session
--                       rather than from a name typed into a form
-- recipient_profile_id  who it was delivered to, resolved from canonical
--                       listing ownership on the server
-- conversation_id       the thread it became, and the idempotency key for
--                       "has this lead already been delivered"
alter table public.leads
  add column if not exists requester_profile_id uuid references public.profiles(id)      on delete set null,
  add column if not exists recipient_profile_id uuid references public.profiles(id)      on delete set null,
  add column if not exists conversation_id      uuid references public.conversations(id) on delete set null;

/*
 * One conversation belongs to at most one lead. Combined with the
 * compare-and-swap in deliverLeadToInbox — which writes conversation_id only
 * `where conversation_id is null and status = 'pending'` and acts on the
 * updated row count — this makes a double approval, a retry or two concurrent
 * admins produce exactly one conversation, one message and one notification.
 * The loser of the CAS deletes the conversation it built, and the cascade
 * takes its participants and message with it.
 */
create unique index if not exists leads_conversation_id_key
  on public.leads (conversation_id) where conversation_id is not null;

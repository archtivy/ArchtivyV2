-- Profile claim requests: support /u/id/[profileId] claim flow (username + message only).
-- Run after claiming-migrations.sql. Safe to run once.

-- Add columns for id-claim flow (requested username, optional message, decision note)
alter table public.profile_claim_requests add column if not exists requested_username text null;
alter table public.profile_claim_requests add column if not exists message text null;
alter table public.profile_claim_requests add column if not exists decision_note text null;
alter table public.profile_claim_requests add column if not exists reviewed_by_clerk_user_id text null;

-- Allow id-claim submissions without name/email (only profile_id, requester_user_id, requested_username, message)
alter table public.profile_claim_requests alter column requester_name drop not null;
alter table public.profile_claim_requests alter column requester_email drop not null;

-- Index for status + created_at (already have idx_pcr_status, idx_pcr_created_at; unique pending per profile exists)
create index if not exists idx_pcr_status_created_at on public.profile_claim_requests (status, created_at desc);

comment on column public.profile_claim_requests.requested_username is 'Requested username for /u/id claim flow; set on submit.';
comment on column public.profile_claim_requests.message is 'Optional message from requester (id-claim flow).';
comment on column public.profile_claim_requests.decision_note is 'Admin note on reject (or approve).';

-- Allow folders to be owned by Clerk users (clerk_user_id) as well as Supabase Auth (user_id).
-- Run after saved-folders-migration.sql. Application uses Clerk; folder actions filter by clerk_user_id using service role.

-- Add Clerk user id column (nullable for existing rows)
alter table public.folders add column if not exists clerk_user_id text;

create index if not exists idx_folders_clerk_user on public.folders (clerk_user_id);

-- Allow user_id to be null so we can insert folders with only clerk_user_id
alter table public.folders alter column user_id drop not null;

-- Optional: policy for service role only; app enforces clerk_user_id in code when using Clerk.
-- No new RLS policy needed: service role bypasses RLS; app checks clerk_user_id = current user.

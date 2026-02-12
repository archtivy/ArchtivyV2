-- Optional: add deleted_at to profiles for soft delete when hard delete fails (FK constraints).
-- Run this if you use Admin > Profiles > Delete and want soft delete as fallback.
-- The admin profiles list filters with: where deleted_at is null.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Optionally index for list queries:
-- CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles (deleted_at) WHERE deleted_at IS NULL;

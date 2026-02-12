-- Admin panel: audit_logs table and profile extensions (admin role, soft disable).
-- Run this in Supabase SQL editor. Ensure profiles.role allows 'admin' (adjust check if needed).

-- 1) Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON public.audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

COMMENT ON TABLE public.audit_logs IS 'Admin action audit trail';

-- 2) Allow admin role on profiles. If your DB has a check constraint on role, run:
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('designer','brand','reader','admin'));
-- (If no constraint exists, 'admin' may already be allowed; no change needed.)

-- 3) Soft disable: optional column for "Disable user"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

COMMENT ON COLUMN public.profiles.disabled_at IS 'When set, user is soft-disabled (admin only).';

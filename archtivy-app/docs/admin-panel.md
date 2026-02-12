# Archtivy Admin Panel

Production-ready admin panel under `/admin` with access control, dashboard, listings management, users management, and audit logging.

## Access control

- All routes under `/admin` are protected. Only users with **role = 'admin'** can access.
- Non-admin users are redirected to `/`.
- Guard is implemented in `src/app/(admin)/admin/layout.tsx` via `requireAdmin()`.

## How to create an admin user

1. Run the SQL migration (see below) so that `profiles.role` can be `'admin'`.
2. In Supabase SQL Editor (or any client), set the role for the desired user:

```sql
-- By Clerk user id (recommended: get this from your auth provider / app)
UPDATE public.profiles
SET role = 'admin'
WHERE clerk_user_id = 'user_xxxxxxxxxxxxx';

-- Or by profile username
UPDATE public.profiles
SET role = 'admin'
WHERE username = 'your-username';
```

After updating, the user must sign in again (or refresh) for the guard to see the new role.

## SQL migrations

Run **`docs/admin-audit-migration.sql`** in the Supabase SQL Editor. It:

1. Creates **`audit_logs`** table: `id`, `admin_user_id`, `action`, `entity_type`, `entity_id`, `metadata` (jsonb), `created_at`.
2. Adds **`profiles.disabled_at`** (timestamptz, nullable) for soft-disabling users.
3. Documents how to allow **`admin`** in `profiles.role` if you have a check constraint (drop and re-add the constraint to include `'admin'`).

## File list (changed / created)

### New files

- `src/lib/admin/guard.ts` – `requireAdmin()` for layout
- `src/lib/db/audit.ts` – `createAuditLog()` and audit types
- `src/app/(admin)/admin/listings/page.tsx` – Listings page with Projects | Products tabs
- `src/app/(admin)/admin/users/page.tsx` – Users list (paginated)
- `src/app/(admin)/admin/users/[id]/page.tsx` – User detail (profile + role/disable/delete)
- `src/app/(admin)/admin/users/[id]/AdminUserActions.tsx` – Client actions (role, disable, delete)
- `src/app/(admin)/admin/_actions/users.ts` – Server actions: `updateUserRole`, `disableUser`, `deleteUser`
- `docs/admin-audit-migration.sql` – Audit table + profile extensions
- `docs/admin-panel.md` – This file

### Modified files

- `src/lib/auth/config.ts` – Added `"admin"` to `ProfileRole`
- `src/lib/types/profiles.ts` – Added optional `disabled_at`
- `src/lib/db/profiles.ts` – Added `getProfileByClerkIdForAdmin()`
- `src/app/(admin)/admin/layout.tsx` – Calls `requireAdmin()` before rendering
- `src/app/(admin)/admin/page.tsx` – Real KPIs (users, listings, projects, products; optional last 7 days) and latest projects from DB
- `src/app/(admin)/admin/_actions/listings.ts` – `deleteListing`, `bulkDeleteListings`, and audit logging for create/update/delete
- `src/components/admin/AdminListingsTable.tsx` – Optional `showDelete` prop; delete + bulk delete with confirmation modal
- `src/components/admin/nav.ts` – Added “Listings” and “Users” nav items

## Features

- **Dashboard (`/admin`)**: Total users, total listings, projects count, products count; optional new users/listings (last 7 days); latest projects table.
- **Listings (`/admin/listings`)**: Tabs Projects | Products; paginated table; search (title); filters (year, location, category for products, no links); View / Edit (links to existing project/product edit); Delete (single + bulk) with confirmation; safe delete (removes `listing_images`, `project_product_links`, then listing).
- **Users (`/admin/users`)**: Paginated table (avatar, name, username, role, listings count, created); user detail page with full profile form, Edit role, Disable (soft), Delete (hard only when user has no listings); section listing their projects/products with links.
- **Audit**: All admin mutations log to `audit_logs` (listing create/update/delete, user role update, disable, delete).

## Toasts

The UI uses `alert()` for success/error feedback on actions. You can replace this with a toast library (e.g. sonner, react-hot-toast) by updating the client components that call the server actions.

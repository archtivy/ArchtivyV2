import type { ReactNode } from "react";
import { AdminPageShell } from "@/components/admin/ui/AdminPageShell";

/**
 * Kept as a thin alias over AdminPageShell.
 *
 * Routes outside this redesign's scope (SEO, Users, Connections, Media, Tools,
 * Settings) import AdminPage. Delegating rather than deleting means they pick
 * up the new header, spacing and type scale without being rewritten — and it
 * leaves one obvious place to finish the migration later.
 */
export function AdminPage({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminPageShell title={title} description={description} actions={actions}>
      {children}
    </AdminPageShell>
  );
}

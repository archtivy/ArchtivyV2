import { AdminPageShell } from "@/components/admin/ui/AdminPageShell";
import { AdminNotificationsClient } from "./AdminNotificationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminNotificationsPage() {
  return (
    <AdminPageShell
      title="Notifications"
      description="Send an announcement to one person, a role, or everyone."
    >
      <AdminNotificationsClient />
    </AdminPageShell>
  );
}

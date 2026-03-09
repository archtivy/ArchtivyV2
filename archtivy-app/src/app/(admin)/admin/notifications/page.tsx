import { AdminPage } from "@/components/admin/AdminPage";
import { AdminNotificationsClient } from "./AdminNotificationsClient";

export default function AdminNotificationsPage() {
  return (
    <AdminPage title="Notifications">
      <AdminNotificationsClient />
    </AdminPage>
  );
}

import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminQueryProvider } from "@/components/admin/AdminQueryProvider";

/**
 * Admin shell.
 *
 * Ground is cream, matching the public site, rather than the old #f5f5f5 grey.
 * Page padding lives in AdminPageShell so every screen agrees on it — the old
 * shell padded here AND each page padded again, which is why spacing varied
 * from route to route.
 */
export function AdminShell({ children }: AdminShellProps) {
  return (
    <AdminQueryProvider>
      <div className="min-h-screen bg-cream font-body text-ink antialiased">
        <AdminSidebar />
        <main className="min-h-screen pl-0 pt-[64px] md:pl-64 md:pt-0">{children}</main>
      </div>
    </AdminQueryProvider>
  );
}

interface AdminShellProps {
  children: ReactNode;
}

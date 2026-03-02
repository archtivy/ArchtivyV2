import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminQueryProvider } from "@/components/admin/AdminQueryProvider";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <AdminQueryProvider>
      <div className="min-h-screen bg-[#f5f5f5] text-zinc-900">
        <AdminSidebar />
        <main className="min-h-screen pl-0 pt-14 md:pl-64 md:pt-0">
          <div className="min-h-screen p-4 md:p-6">{children}</div>
        </main>
      </div>
    </AdminQueryProvider>
  );
}

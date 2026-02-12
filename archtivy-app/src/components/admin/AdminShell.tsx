import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

interface AdminShellProps {
  children: ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-zinc-100/80 text-zinc-900">
      <AdminSidebar />
      <main className="min-h-screen pl-0 pt-14 md:pl-64 md:pt-0">
        <div className="min-h-screen p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

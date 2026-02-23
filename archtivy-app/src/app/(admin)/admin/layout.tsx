export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/guard";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Admin • Archtivy",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}


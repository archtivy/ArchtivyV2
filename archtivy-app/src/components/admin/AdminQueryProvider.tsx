"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { getAdminQueryClient } from "@/lib/admin/queryClient";
import { AdminToastProvider } from "@/components/admin/AdminToast";

/**
 * Wraps the entire admin subtree with:
 * - QueryClientProvider (React Query)
 * - AdminToastProvider (toast notifications)
 */
export function AdminQueryProvider({ children }: { children: ReactNode }) {
  const client = getAdminQueryClient();
  return (
    <QueryClientProvider client={client}>
      <AdminToastProvider>{children}</AdminToastProvider>
    </QueryClientProvider>
  );
}

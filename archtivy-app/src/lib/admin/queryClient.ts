import { QueryClient } from "@tanstack/react-query";

let client: QueryClient | null = null;

/**
 * Singleton QueryClient for the admin panel.
 * staleTime = 0 forces every mount to refetch.
 * refetchOnWindowFocus = true refetches when tab regains focus.
 * refetchInterval handled per-query (15 000 ms fallback).
 */
export function getAdminQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 0,
          refetchOnWindowFocus: true,
          retry: 2,
          retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
        },
      },
    });
  }
  return client;
}

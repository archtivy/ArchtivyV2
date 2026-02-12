import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client with user session for Gallery (bookmarks).
 * Use only in Server Components / Server Actions. When no Supabase Auth session exists, getUser() returns null.
 */
export async function getSupabaseGalleryClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: set not available
        }
      },
    },
  });
}

export async function getSupabaseGalleryUserId(): Promise<string | null> {
  const sup = await getSupabaseGalleryClient();
  const { data: { user } } = await sup.auth.getUser();
  return user?.id ?? null;
}

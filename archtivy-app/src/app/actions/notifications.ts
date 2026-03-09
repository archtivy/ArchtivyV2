"use server";

import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { markAsRead, markAllAsRead } from "@/lib/db/notifications";

export async function markNotificationRead(
  notificationId: string
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in required." };

  const { error } = await markAsRead(notificationId);
  if (error) return { error };
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "Sign in required." };

  const profileResult = await getProfileByClerkId(userId);
  const profile = profileResult.data;
  if (!profile) return { error: "Profile not found." };

  const { error } = await markAllAsRead(profile.id);
  if (error) return { error };
  return {};
}

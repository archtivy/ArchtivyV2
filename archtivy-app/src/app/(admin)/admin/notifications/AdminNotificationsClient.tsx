"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminSendNotification } from "@/components/admin/AdminSendNotification";

interface SentNotification {
  id: string;
  recipient_profile_id: string;
  recipient_display_name: string | null;
  recipient_username: string | null;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  priority: string;
  is_read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "bg-red-50 text-red-600 border-red-100"
      : priority === "low"
      ? "bg-zinc-50 text-zinc-400 border-zinc-100"
      : "bg-zinc-50 text-zinc-500 border-zinc-100";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>
      {priority}
    </span>
  );
}

export function AdminNotificationsClient() {
  const [history, setHistory] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((json) => setHistory(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-8">
      {/* Send form */}
      <div className="rounded border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 uppercase tracking-wider">
          Send Notification
        </h2>
        <AdminSendNotification onSent={fetchHistory} />
      </div>

      {/* History table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 uppercase tracking-wider">
          Recent Notifications
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-zinc-400">No admin notifications sent yet.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Message</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Read</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {history.map((n) => (
                  <tr key={n.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-zinc-900">
                        {n.recipient_display_name?.trim() || n.recipient_username || "—"}
                      </span>
                      {n.recipient_username && (
                        <span className="ml-1.5 text-zinc-400 text-xs">@{n.recipient_username}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-zinc-700">{n.title ?? "—"}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate text-zinc-500">{n.body ?? "—"}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={n.priority} /></td>
                    <td className="px-4 py-3">
                      {n.is_read ? (
                        <span className="text-green-600 text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-zinc-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">{timeAgo(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

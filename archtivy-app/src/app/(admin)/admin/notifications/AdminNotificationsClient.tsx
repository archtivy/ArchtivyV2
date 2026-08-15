"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminSendNotification } from "@/components/admin/AdminSendNotification";
import { Panel } from "@/components/admin/ui/AdminPageShell";
import { StatusPill } from "@/components/admin/ui/StatusPill";
import {
  TableShell,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  TDNum,
  CellStack,
  TableEmpty,
} from "@/components/admin/ui/DataTable";
import { TYPE } from "@/components/admin/ui/tokens";

interface SentNotification {
  id: string;
  group_key: string | null;
  recipient_count: number;
  recipient_display_name: string | null;
  recipient_username: string | null;
  read_count: number;
  title: string | null;
  body: string | null;
  cta_label: string | null;
  cta_url: string | null;
  priority: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function PriorityPill({ priority }: { priority: string }) {
  if (priority === "high") return <StatusPill tone="critical">High</StatusPill>;
  if (priority === "low") return <StatusPill tone="neutral">Low</StatusPill>;
  return <StatusPill tone="neutral">Normal</StatusPill>;
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
      <Panel
        title="Compose"
        description="Admin notifications appear in the recipient's bell alongside their normal activity."
      >
        <AdminSendNotification onSent={fetchHistory} />
      </Panel>

      <section className="space-y-4">
        <div>
          <h2 className={TYPE.sectionTitle}>Sent history</h2>
          <p className={`mt-0.5 ${TYPE.pageSubtitle}`}>
            Broadcasts are shown as one entry, not one row per recipient.
          </p>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl border border-hairline bg-white" />
        ) : (
          <TableShell>
            <Table minWidth={880}>
              <THead>
                <TH>Message</TH>
                <TH>Audience</TH>
                <TH>Priority</TH>
                <TH align="right">Read</TH>
                <TH align="right">Sent</TH>
              </THead>
              <TBody>
                {history.map((n) => (
                  <TR key={n.id}>
                    <TD className="max-w-[380px]">
                      <CellStack title={n.title ?? "—"} sub={n.body ?? undefined} />
                    </TD>
                    <TD>
                      {n.recipient_count > 1 ? (
                        <StatusPill tone="info">
                          {n.recipient_count} recipients
                        </StatusPill>
                      ) : (
                        <span className="font-body text-[14px] text-muted">
                          {n.recipient_display_name?.trim() ||
                            (n.recipient_username ? `@${n.recipient_username}` : "One person")}
                        </span>
                      )}
                    </TD>
                    <TD>
                      <PriorityPill priority={n.priority} />
                    </TD>
                    <TDNum muted={n.read_count === 0}>
                      {n.read_count}/{n.recipient_count}
                    </TDNum>
                    <TD align="right" className="text-muted">
                      {timeAgo(n.created_at)}
                    </TD>
                  </TR>
                ))}
                {history.length === 0 && (
                  <TableEmpty
                    colSpan={5}
                    title="Nothing sent yet"
                    hint="Admin notifications you send will be listed here with their read counts."
                  />
                )}
              </TBody>
            </Table>
          </TableShell>
        )}
      </section>
    </div>
  );
}

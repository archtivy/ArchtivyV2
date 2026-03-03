import { MarketingPage, MarketingSection } from "@/components/marketing/MarketingPage";

export const metadata = {
  title: "Platform Status | Archtivy",
  description: "Current operational status of Archtivy platform services.",
};

const SERVICES = [
  { name: "Web application", status: "operational" },
  { name: "API", status: "operational" },
  { name: "File storage", status: "operational" },
  { name: "Search and indexing", status: "operational" },
  { name: "Authentication", status: "operational" },
  { name: "Database", status: "operational" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  operational: {
    label: "Operational",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  degraded: {
    label: "Degraded",
    color: "text-amber-600 dark:text-amber-400",
  },
  outage: { label: "Outage", color: "text-red-600 dark:text-red-400" },
};

export default function StatusPage() {
  const allOperational = SERVICES.every((s) => s.status === "operational");

  return (
    <MarketingPage
      label="Platform Status"
      headline={
        allOperational
          ? "All systems operational."
          : "Service disruption in progress."
      }
      subheadline="Current operational status of Archtivy platform services."
    >
      {/* Overall indicator */}
      <MarketingSection>
        <div
          className={`flex items-center gap-3 rounded-[4px] border px-6 py-4 ${
            allOperational
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
              : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              allOperational ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <p
            className={`text-sm font-medium ${
              allOperational
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }`}
          >
            {allOperational
              ? "All Archtivy services are operating normally."
              : "One or more services are experiencing issues."}
          </p>
        </div>
      </MarketingSection>

      {/* Service list */}
      <MarketingSection heading="Services">
        <div className="overflow-hidden rounded-[4px] border border-zinc-200 dark:border-zinc-800">
          {SERVICES.map(({ name, status }, i) => {
            const { label, color } = STATUS_LABELS[status];
            return (
              <div
                key={name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i < SERVICES.length - 1
                    ? "border-b border-zinc-100 dark:border-zinc-800"
                    : ""
                }`}
              >
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {name}
                </span>
                <span className={`text-xs font-medium ${color}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </MarketingSection>

      {/* Incident history */}
      <MarketingSection heading="Incident history">
        <div className="rounded-[4px] border border-zinc-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No incidents recorded in the past 90 days.
          </p>
        </div>
      </MarketingSection>

      {/* Contact */}
      <MarketingSection>
        <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          To report an issue or request support, contact{" "}
          <a
            href="mailto:support@archtivy.com"
            className="font-medium text-[#002abf] hover:underline dark:text-[#4d6fff]"
          >
            support@archtivy.com
          </a>
          .
        </p>
      </MarketingSection>
    </MarketingPage>
  );
}

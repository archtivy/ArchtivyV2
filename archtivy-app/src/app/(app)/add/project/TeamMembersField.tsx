"use client";

import { Button } from "@/components/ui/Button";
import { TeamMemberNameInput } from "@/components/add/TeamMemberNameInput";

const inputClass =
  "w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white px-3 py-2.5 text-zinc-900 placeholder-zinc-500 focus:border-archtivy-primary focus:outline-none focus:ring-1 focus:ring-archtivy-primary/50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400";
const labelClass = "mb-1.5 block text-sm font-medium text-zinc-900 dark:text-zinc-100";

export interface MemberTitleRow {
  label: string;
  maps_to_role: "designer" | "brand";
  sort_order: number;
}

export interface TeamMembersFieldProps {
  memberTitles: MemberTitleRow[];
  teamRows: Array<{ name: string; role: string }>;
  onAddRow: () => void;
  onUpdateRow: (index: number, field: "name" | "role", value: string) => void;
  onRemoveRow: (index: number) => void;
}

export function TeamMembersField({
  memberTitles,
  teamRows,
  onAddRow,
  onUpdateRow,
  onRemoveRow,
}: TeamMembersFieldProps) {
  const designerTitles = memberTitles.filter((t) => t.maps_to_role === "designer");
  const brandTitles = memberTitles.filter((t) => t.maps_to_role === "brand");

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className={labelClass}>Team members (optional)</span>
        <Button type="button" variant="secondary" onClick={onAddRow}>
          Add row
        </Button>
      </div>
      <div className="space-y-3">
        {teamRows.map((row, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700 md:flex-row md:items-center md:gap-2 md:border-0 md:p-0"
          >
            <div className="w-full md:min-w-[140px] md:w-auto">
              <select
                value={row.role}
                onChange={(e) => onUpdateRow(i, "role", e.target.value)}
                className={inputClass}
                aria-label="Role"
              >
                <option value="">Role</option>
                {designerTitles.length > 0 && (
                  <optgroup label="Designer">
                    {designerTitles.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                )}
                {brandTitles.length > 0 && (
                  <optgroup label="Manufacturer / Brand">
                    {brandTitles.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="w-full min-w-0 md:min-w-[240px] md:flex-1">
              <TeamMemberNameInput
                value={row.name}
                onChange={(v) => onUpdateRow(i, "name", v)}
                placeholder="Name (type to suggest profiles)"
                aria-label="Team member name"
              />
            </div>
            <div className="flex justify-end md:shrink-0">
              <Button type="button" variant="secondary" onClick={() => onRemoveRow(i)}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

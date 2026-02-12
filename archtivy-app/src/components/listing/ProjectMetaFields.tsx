"use client";

const inputClass =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "block text-sm font-medium text-zinc-900 dark:text-zinc-100";

export type BuildStatus = "planned" | "ongoing" | "completed";

export interface ProjectMetaFieldsProps {
  buildStatus?: BuildStatus | null;
  collaborationOpen?: boolean;
  areaSqft?: number | null;
  areaSqm?: number | null;
  /** If true, use controlled form fields with name attributes for form submit. */
  asFormFields?: boolean;
}

const BUILD_OPTIONS: { value: BuildStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
];

export function ProjectMetaFields({
  buildStatus = null,
  collaborationOpen = false,
  areaSqft = null,
  areaSqm = null,
  asFormFields = true,
}: ProjectMetaFieldsProps) {
  const areaValue = areaSqft != null ? String(areaSqft) : "";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Project metadata
      </h3>

      <div>
        <label htmlFor="build_status" className={labelClass}>
          Build status
        </label>
        <select
          id="build_status"
          name={asFormFields ? "build_status" : undefined}
          defaultValue={buildStatus ?? ""}
          className={inputClass}
        >
          <option value="">—</option>
          {BUILD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="collaboration_open"
          name={asFormFields ? "collaboration_open" : undefined}
          defaultChecked={collaborationOpen}
          value="1"
          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <label htmlFor="collaboration_open" className="text-sm text-zinc-900 dark:text-zinc-100">
          Collaboration open
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="area_value" className={labelClass}>
            Area
          </label>
          <input
            id="area_value"
            type="number"
            min={0}
            step={0.01}
            name={asFormFields ? "area_value" : undefined}
            defaultValue={areaValue}
            placeholder="e.g. 2500"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="area_unit" className={labelClass}>
            Unit
          </label>
          <select
            id="area_unit"
            name={asFormFields ? "area_unit" : undefined}
            defaultValue="sqft"
            className={inputClass}
          >
            <option value="sqft">sq ft</option>
            <option value="sqm">sq m</option>
          </select>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { MaterialRow } from "@/lib/db/materials";

/** Row shape from public.materials (id, name, slug) */
interface MaterialOption {
  id: string;
  name: string;
  slug: string;
}

export interface MaterialsMultiSelectProps {
  label?: string;
  placeholder?: string;
  options: MaterialRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

export function MaterialsMultiSelect({
  label,
  placeholder = "Search materials",
  options,
  selectedIds,
  onChange,
  disabled,
}: MaterialsMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fetchMaterials = useCallback(async (q: string) => {
    setLoading(true);
    try {
      let req = supabase
        .from("materials")
        .select("id,name,slug")
        .order("name", { ascending: true })
        .limit(20);
      if (q.trim()) {
        req = req.ilike("name", `%${q.trim()}%`);
      }
      const { data, error } = await req;
      if (error) {
        console.error("[MaterialsMultiSelect] Supabase error:", error);
        setDropdownOptions([]);
        return;
      }
      setDropdownOptions((data ?? []) as MaterialOption[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials(query);
  }, [query, fetchMaterials]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = new Set(selectedIds);
  const filtered = dropdownOptions.filter((opt) => !selectedSet.has(opt.id));

  const addSelected = useCallback(
    (opt: MaterialOption) => {
      if (selectedSet.has(opt.id)) return;
      onChange([...selectedIds, opt.id]);
      setSelectedLabels((prev) => ({ ...prev, [opt.id]: opt.name }));
      setQuery("");
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [selectedIds, onChange]
  );

  const removeId = useCallback(
    (id: string) => {
      onChange(selectedIds.filter((x) => x !== id));
      setSelectedLabels((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [selectedIds, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[0]) addSelected(filtered[0]);
    }
    if (e.key === "Backspace" && query === "" && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1));
    }
  };

  const chipLabel = (id: string) =>
    options.find((o) => o.id === id)?.display_name ?? selectedLabels[id] ?? id;

  const showNoResults = query.trim() !== "" && !loading && filtered.length === 0;

  return (
    <div className="space-y-2" ref={containerRef}>
      {label ? (
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </label>
      ) : null}

      <div className="relative rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="flex items-center gap-1 rounded-full bg-archtivy-primary/10 px-3 py-1 text-xs font-medium text-archtivy-primary dark:bg-archtivy-primary/20"
            >
              {chipLabel(id)}
              <button
                type="button"
                className="rounded-full p-0.5 text-archtivy-primary hover:bg-archtivy-primary/20"
                onClick={() => removeId(id)}
                aria-label={`Remove ${chipLabel(id)}`}
                disabled={disabled}
              >
                <span aria-hidden className="text-xs font-bold leading-none">
                  ×
                </span>
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedIds.length === 0 ? placeholder : ""}
            className="min-w-[140px] flex-1 border-none bg-transparent px-1 py-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none dark:text-zinc-100"
            aria-label={placeholder}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
          />
        </div>

        {isOpen && (
          <ul
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="listbox"
          >
            {loading && dropdownOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                Loading…
              </li>
            ) : showNoResults ? (
              <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                No results
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addSelected(opt)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span>{opt.name}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {opt.slug}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

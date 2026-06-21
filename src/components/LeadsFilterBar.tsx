"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import { STAGES, STAGE_LABELS } from "@/lib/constants";

export interface FilterOption {
  id: string;
  name: string;
}

export function LeadsFilterBar({
  cohorts,
  tracks,
  reps,
  segments,
  showRepFilter,
}: {
  cohorts: FilterOption[];
  tracks: FilterOption[];
  reps: FilterOption[];
  segments: string[];
  showRepFilter: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/leads?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <FilterSelect
        label="Cohort"
        param="cohortId"
        value={sp.get("cohortId") ?? ""}
        options={cohorts}
        onChange={setParam}
      />
      <FilterSelect
        label="Track"
        param="trackId"
        value={sp.get("trackId") ?? ""}
        options={tracks}
        onChange={setParam}
      />
      <div className="w-44">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Stage
        </label>
        <Select
          value={sp.get("stage") ?? ""}
          onChange={(e) => setParam("stage", e.target.value)}
        >
          <option value="">All</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      {segments.length > 1 && (
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Segment
          </label>
          <Select
            value={sp.get("segment") ?? ""}
            onChange={(e) => setParam("segment", e.target.value)}
          >
            <option value="">All</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      )}
      {showRepFilter && (
        <FilterSelect
          label="Closer"
          param="repId"
          value={sp.get("repId") ?? ""}
          options={reps}
          onChange={setParam}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  param,
  value,
  options,
  onChange,
}: {
  label: string;
  param: string;
  value: string;
  options: FilterOption[];
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="w-44">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onChange={(e) => onChange(param, e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

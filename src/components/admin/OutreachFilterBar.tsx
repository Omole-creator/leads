"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  OUTREACH_REQUIREMENTS,
  REQUIREMENT_LABELS,
  type OutreachRequirement,
} from "@/lib/outreach-constants";

export interface OutreachFacets {
  industries: string[];
  jobTitles: string[];
  locations: string[];
  companySizes: string[];
  hiringSources: string[];
}

/** Filters as the UI holds them: everything is a string, dates are YYYY-MM-DD. */
export interface OutreachFiltersDTO {
  q?: string;
  batchId?: string;
  addedFrom?: string;
  addedTo?: string;
  industry?: string;
  jobTitle?: string;
  location?: string;
  companySize?: string;
  hiringSource?: string;
  require?: OutreachRequirement[];
  includeUnsubscribed?: boolean;
}

export function OutreachFilterBar({
  facets,
  batches,
  value,
  onChange,
  showRequirements,
  showUnsubscribedToggle,
}: {
  facets: OutreachFacets;
  batches: { id: string; name: string }[];
  value: OutreachFiltersDTO;
  onChange: (next: OutreachFiltersDTO) => void;
  /** The tick-boxes. Shown in the composer, hidden on the plain list. */
  showRequirements?: boolean;
  showUnsubscribedToggle?: boolean;
}) {
  const set = (patch: Partial<OutreachFiltersDTO>) =>
    onChange({ ...value, ...patch });

  const require = value.require ?? [];
  const toggleRequirement = (r: OutreachRequirement) =>
    set({
      require: require.includes(r)
        ? require.filter((x) => x !== r)
        : [...require, r],
    });

  const anyFilter =
    Object.entries(value).some(
      ([k, v]) => k !== "require" && v !== undefined && v !== "" && v !== false,
    ) || require.length > 0;

  return (
    <div className="space-y-4 rounded-xl border border-brand-black/10 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" wide>
          <Input
            placeholder="Email, company or first name"
            value={value.q ?? ""}
            onChange={(e) => set({ q: e.target.value })}
          />
        </Field>

        <Field label="Batch">
          <Select
            value={value.batchId ?? ""}
            onChange={(e) => set({ batchId: e.target.value })}
          >
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
            <option value="none">No batch</option>
          </Select>
        </Field>

        <Field label="Added from">
          <Input
            type="date"
            value={value.addedFrom ?? ""}
            onChange={(e) => set({ addedFrom: e.target.value })}
          />
        </Field>
        <Field label="Added to">
          <Input
            type="date"
            value={value.addedTo ?? ""}
            onChange={(e) => set({ addedTo: e.target.value })}
          />
        </Field>

        <FacetSelect
          label="Industry"
          options={facets.industries}
          value={value.industry}
          onChange={(v) => set({ industry: v })}
        />
        <FacetSelect
          label="Job title"
          options={facets.jobTitles}
          value={value.jobTitle}
          onChange={(v) => set({ jobTitle: v })}
        />
        <FacetSelect
          label="Location"
          options={facets.locations}
          value={value.location}
          onChange={(v) => set({ location: v })}
        />
        <FacetSelect
          label="Company size"
          options={facets.companySizes}
          value={value.companySize}
          onChange={(v) => set({ companySize: v })}
        />
        <FacetSelect
          label="Hiring source"
          options={facets.hiringSources}
          value={value.hiringSource}
          onChange={(v) => set({ hiringSource: v })}
        />

        {anyFilter && (
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            Clear filters
          </Button>
        )}
      </div>

      {showRequirements && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Only include contacts that have these details filled in
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {OUTREACH_REQUIREMENTS.map((r) => (
              <label
                key={r}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-brand-yellow"
                  checked={require.includes(r)}
                  onChange={() => toggleRequirement(r)}
                />
                {REQUIREMENT_LABELS[r]}
              </label>
            ))}
          </div>
        </div>
      )}

      {showUnsubscribedToggle && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-brand-yellow"
            checked={!!value.includeUnsubscribed}
            onChange={(e) => set({ includeUnsubscribed: e.target.checked })}
          />
          Show unsubscribed contacts
        </label>
      )}
    </div>
  );
}

function FacetSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange: (v: string) => void;
}) {
  // Nothing imported has this field yet, so the dropdown would be empty.
  if (options.length === 0) return null;
  return (
    <Field label={label}>
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "w-64" : "w-44"}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

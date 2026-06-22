"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

/**
 * Cohort picker for the attendance pages. Defaults to the active cohort (server
 * resolves the empty value), and writes `?cohort=<id>` so a tutor/admin can view
 * past cohorts. Keeps cohorts separate — e.g. April students don't show in July.
 */
export function CohortFilter({
  cohorts,
  value,
}: {
  cohorts: { id: string; name: string; active: boolean }[];
  value: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function select(id: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("cohort", id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        Cohort
      </span>
      <Select
        aria-label="Cohort"
        className="w-64"
        value={value}
        onChange={(e) => select(e.target.value)}
      >
        <option value="all">All cohorts</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.active ? " (current)" : ""}
          </option>
        ))}
      </Select>
    </label>
  );
}

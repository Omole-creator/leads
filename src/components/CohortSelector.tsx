"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";

export interface CohortOption {
  id: string;
  name: string;
}

export function CohortSelector({ cohorts }: { cohorts: CohortOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onChange(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set("cohortId", value);
    else next.delete("cohortId");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="w-56">
      <Select
        aria-label="Filter by cohort"
        value={sp.get("cohortId") ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All cohorts</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Select } from "@/components/ui/select";

export interface RepOption {
  id: string;
  name: string;
}

export function ReassignControl({
  leadId,
  assignedRepId,
  reps,
}: {
  leadId: string;
  assignedRepId: string | null;
  reps: RepOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(assignedRepId ?? "");
  const [pending, start] = useTransition();

  async function onChange(repId: string) {
    setValue(repId);
    if (!repId) return;
    const res = await fetch(`/api/leads/${leadId}/reassign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedRepId: repId }),
    });
    if (res.ok) start(() => router.refresh());
  }

  return (
    <Select
      aria-label="Assigned rep"
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Unassigned</option>
      {reps.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}

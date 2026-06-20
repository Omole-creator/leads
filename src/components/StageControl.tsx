"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Stage } from "@prisma/client";
import { Select } from "@/components/ui/select";
import { STAGES, STAGE_LABELS } from "@/lib/constants";

export function StageControl({
  leadId,
  stage,
}: {
  leadId: string;
  stage: Stage;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Stage>(stage);
  const [pending, start] = useTransition();

  async function onChange(next: Stage) {
    setValue(next);
    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next }),
    });
    if (res.ok) start(() => router.refresh());
  }

  return (
    <Select
      aria-label="Lead stage"
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value as Stage)}
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {STAGE_LABELS[s]}
        </option>
      ))}
    </Select>
  );
}

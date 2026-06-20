"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FollowUp, FollowUpType } from "@prisma/client";
import { FOLLOW_UP_TYPES, FOLLOW_UP_LABELS } from "@/lib/constants";

export function FollowUpChecklist({
  leadId,
  followUps,
}: {
  leadId: string;
  followUps: Pick<FollowUp, "type" | "done" | "completedAt">[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const initial = Object.fromEntries(
    followUps.map((f) => [f.type, f.done]),
  ) as Record<FollowUpType, boolean>;
  const [state, setState] = useState(initial);

  async function toggle(type: FollowUpType, done: boolean) {
    setState((s) => ({ ...s, [type]: done }));
    const res = await fetch(`/api/leads/${leadId}/followups`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, done }),
    });
    if (res.ok) start(() => router.refresh());
  }

  return (
    <ul className="space-y-2">
      {FOLLOW_UP_TYPES.map((type) => (
        <li key={type}>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-yellow"
              checked={!!state[type]}
              onChange={(e) => toggle(type, e.target.checked)}
            />
            <span className={state[type] ? "text-brand-black/50 line-through" : ""}>
              {FOLLOW_UP_LABELS[type]}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function AssignUnassignedButton({
  count,
  filtered,
}: {
  count: number;
  filtered: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run() {
    const scope = filtered ? "in this filter" : "across all leads";
    if (!confirm(`Distribute ${count} unassigned lead(s) ${scope} evenly across active closers?`))
      return;
    setBusy(true);
    const res = await fetch("/api/leads/distribute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cohortId: sp.get("cohortId") || undefined,
        trackId: sp.get("trackId") || undefined,
        stage: sp.get("stage") || undefined,
        segment: sp.get("segment") || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) start(() => router.refresh());
    else alert((await res.json()).error ?? "Failed to assign");
  }

  if (count === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={busy || pending}>
      Assign {count} unassigned{filtered ? " (filtered)" : ""}
    </Button>
  );
}

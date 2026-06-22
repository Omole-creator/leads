"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function BulkAssignControl({
  reps,
  count,
}: {
  reps: { id: string; name: string }[];
  count: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [repId, setRepId] = useState("");
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!repId) return;
    const name = reps.find((r) => r.id === repId)?.name ?? "this closer";
    if (!confirm(`Assign all ${count} lead(s) in the current view to ${name}?`))
      return;
    setBusy(true);
    const res = await fetch("/api/leads/assign-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repId,
        cohortId: sp.get("cohortId") || undefined,
        trackId: sp.get("trackId") || undefined,
        stage: sp.get("stage") || undefined,
        segment: sp.get("segment") || undefined,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setRepId("");
      start(() => router.refresh());
    } else alert((await res.json()).error ?? "Failed to assign");
  }

  if (reps.length === 0 || count === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <Select
        aria-label="Assign all to closer"
        value={repId}
        onChange={(e) => setRepId(e.target.value)}
        className="h-8 w-40 text-xs"
      >
        <option value="">Assign all to…</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </Select>
      <Button size="sm" onClick={run} disabled={busy || pending || !repId}>
        Go
      </Button>
    </div>
  );
}

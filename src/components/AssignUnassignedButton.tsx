"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function AssignUnassignedButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm(`Distribute ${count} unassigned lead(s) evenly across active closers?`))
      return;
    setBusy(true);
    const res = await fetch("/api/leads/distribute", { method: "POST" });
    setBusy(false);
    if (res.ok) start(() => router.refresh());
    else alert((await res.json()).error ?? "Failed to assign");
  }

  if (count === 0) return null;

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={busy || pending}>
      Assign {count} unassigned
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const OFFSETS = [3, 7, 14, 21, 29];
const DAY = 24 * 60 * 60 * 1000;
const fmt = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Compact follow-up control for a leads-list row: shows progress + the next
 * due date, colored by urgency (red overdue, amber due-soon). One tap logs the
 * follow-up and advances. Visible without opening the lead.
 */
export function FollowUpQuickButton({
  leadId,
  createdAt,
  count,
}: {
  leadId: string;
  createdAt: string | Date;
  count: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const done = count >= OFFSETS.length;
  const nextDue = done
    ? null
    : new Date(new Date(createdAt).getTime() + OFFSETS[count] * DAY);
  const msLeft = nextDue ? nextDue.getTime() - Date.now() : 0;
  const overdue = nextDue ? msLeft < 0 : false;
  const soon = nextDue ? msLeft >= 0 && msLeft < 2 * DAY : false;

  async function log() {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/followup-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reached: true }),
    });
    setBusy(false);
    if (res.ok) start(() => router.refresh());
  }

  if (done) {
    return (
      <span className="inline-flex items-center rounded-full bg-brand-black px-2.5 py-1 text-xs font-medium text-brand-white">
        ✓ 5/5
      </span>
    );
  }

  return (
    <button
      onClick={log}
      disabled={busy || pending}
      title={`Log follow-up ${count + 1} (due ${nextDue ? nextDue.toLocaleDateString() : ""})`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        overdue
          ? "bg-brand-red text-brand-white hover:brightness-110"
          : soon
            ? "bg-amber-400 text-brand-black hover:brightness-95"
            : "bg-brand-yellow text-brand-black hover:brightness-95",
      )}
    >
      <span>
        FU{count + 1} · {nextDue ? fmt(nextDue) : ""}
      </span>
      <span className="opacity-70">({count}/5)</span>
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FollowUpLogItem {
  id: string;
  reached: boolean;
  createdAt: string | Date;
  by: { name: string } | null;
}

// Fixed cadence (days after the lead came in / initial contact).
const SCHEDULE = [
  { n: 1, day: 3, label: "1st follow-up" },
  { n: 2, day: 7, label: "2nd follow-up" },
  { n: 3, day: 14, label: "3rd follow-up" },
  { n: 4, day: 21, label: "4th follow-up" },
  { n: 5, day: 29, label: "5th follow-up" },
];
const DAY = 24 * 60 * 60 * 1000;
const fmtDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function FollowUpLogPanel({
  leadId,
  createdAt,
  logs,
}: {
  leadId: string;
  createdAt: string | Date;
  logs: FollowUpLogItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const base = new Date(createdAt);
  const asc = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const count = Math.min(asc.length, SCHEDULE.length);
  const done = count >= SCHEDULE.length;
  const next = done ? null : SCHEDULE[count];
  const nextDue = next ? new Date(base.getTime() + next.day * DAY) : null;
  const overdue = nextDue ? nextDue.getTime() < Date.now() : false;

  async function logFollowUp() {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/followup-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reached: true }),
    });
    setBusy(false);
    if (res.ok) start(() => router.refresh());
  }

  async function undo() {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/followup-logs`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) start(() => router.refresh());
  }

  const disabled = busy || pending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{count} of 5 follow-ups done</span>
        <div className="flex gap-1.5">
          {SCHEDULE.map((s, i) => (
            <span
              key={s.n}
              title={`${s.label} (Day ${s.day})`}
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                i < count ? "bg-brand-yellow" : "bg-brand-black/15",
              )}
            />
          ))}
        </div>
      </div>

      {/* The single advancing action button */}
      {next ? (
        <Button
          className="w-full bg-brand-yellow text-brand-black hover:brightness-95"
          disabled={disabled}
          onClick={logFollowUp}
        >
          Mark {next.label} done
          <span className="ml-1 font-normal">
            · due {nextDue ? fmtDate(nextDue) : ""}
          </span>
        </Button>
      ) : (
        <div className="rounded-md bg-brand-black px-4 py-2 text-center text-sm font-medium text-brand-white">
          ✓ All 5 follow-ups completed
        </div>
      )}
      {next && (
        <p className="text-xs text-muted-foreground">
          {overdue ? (
            <span className="font-medium text-brand-red">Overdue — </span>
          ) : (
            "Scheduled for "
          )}
          Day {next.day} (
          {nextDue ? nextDue.toLocaleDateString() : ""}). Press the button once
          you&apos;ve reached out; it advances to the next one automatically.
        </p>
      )}

      {/* The schedule with done dates (admin & closer can see all 5) */}
      <ul className="space-y-1.5">
        {SCHEDULE.map((s, i) => {
          const doneAt = asc[i]?.createdAt;
          const due = new Date(base.getTime() + s.day * DAY);
          const isNext = i === count && !done;
          return (
            <li
              key={s.n}
              className={cn(
                "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                doneAt
                  ? "border-brand-yellow/40 bg-brand-yellow/10"
                  : isNext
                    ? "border-brand-black/30"
                    : "border-brand-black/10",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">Day {s.day}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {doneAt
                  ? `✓ done ${new Date(doneAt).toLocaleDateString()}`
                  : `due ${fmtDate(due)}`}
              </span>
            </li>
          );
        })}
      </ul>

      {count > 0 && (
        <button
          onClick={undo}
          disabled={disabled}
          className="text-xs text-muted-foreground underline hover:text-brand-black disabled:opacity-50"
        >
          Undo last follow-up
        </button>
      )}
    </div>
  );
}

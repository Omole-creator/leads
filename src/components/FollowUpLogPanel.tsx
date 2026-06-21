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

const TARGET = 5;

export function FollowUpLogPanel({
  leadId,
  logs,
}: {
  leadId: string;
  logs: FollowUpLogItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const count = logs.length;

  async function log(reached: boolean) {
    setBusy(true);
    const res = await fetch(`/api/leads/${leadId}/followup-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reached }),
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
      {/* Progress toward the recommended 5 touches */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {count} follow-up{count === 1 ? "" : "s"} logged
          </span>
          <span className="text-muted-foreground">
            {Math.min(count, TARGET)} / {TARGET} target
          </span>
        </div>
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: Math.max(TARGET, count) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 flex-1 rounded-full",
                i < count ? "bg-brand-yellow" : "bg-brand-black/10",
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Tip: most deals close after 4–5 follow-ups. Tap a button each time you
          reach out.
        </p>
      </div>

      {/* One tap per follow-up */}
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-brand-yellow text-brand-black hover:brightness-95"
          disabled={disabled}
          onClick={() => log(true)}
        >
          ✅ Reached
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={disabled}
          onClick={() => log(false)}
        >
          ❌ No answer
        </Button>
      </div>

      {/* History */}
      <ul className="space-y-1.5">
        {logs.map((l, idx) => (
          <li
            key={l.id}
            className="flex items-center justify-between rounded-md border border-brand-black/10 px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                #{logs.length - idx}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  l.reached
                    ? "bg-brand-yellow text-brand-black"
                    : "bg-brand-red/10 text-brand-red",
                )}
              >
                {l.reached ? "Reached" : "No answer"}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {l.by?.name ?? "—"} · {new Date(l.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
        {logs.length === 0 && (
          <li className="text-sm text-muted-foreground">
            No follow-ups yet — tap a button above after your first outreach.
          </li>
        )}
      </ul>

      {logs.length > 0 && (
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

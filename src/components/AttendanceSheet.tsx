"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  fullName: string;
}

export function AttendanceSheet({
  trackId,
  date,
  students,
  existing,
  totals,
}: {
  trackId: string;
  date: string; // yyyy-mm-dd
  students: Student[];
  existing: Record<string, boolean>;
  totals: Record<string, { present: number; total: number }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Default everyone present unless we already recorded otherwise for this date.
  const [marks, setMarks] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      students.map((s) => [s.id, existing[s.id] ?? true]),
    ),
  );

  function setDate(d: string) {
    const next = new URLSearchParams(sp.toString());
    next.set("date", d);
    router.push(`${pathname}?${next.toString()}`);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trackId,
        date,
        marks: students.map((s) => ({ leadId: s.id, present: marks[s.id] })),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      start(() => router.refresh());
    }
  }

  const presentCount = students.filter((s) => marks[s.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Class date
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          {presentCount} present · {students.length - presentCount} absent ·{" "}
          {students.length} students
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-lg border border-brand-black/10 p-6 text-center text-sm text-muted-foreground">
          No active students in this track yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const present = marks[s.id];
            const t = totals[s.id] ?? { present: 0, total: 0 };
            return (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-black/10 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    Present {t.present} · Absent {t.total - t.present} (all classes)
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setMarks((m) => ({ ...m, [s.id]: true }))}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      present
                        ? "bg-brand-yellow text-brand-black"
                        : "bg-brand-black/5 text-brand-black/60",
                    )}
                  >
                    Present
                  </button>
                  <button
                    onClick={() => setMarks((m) => ({ ...m, [s.id]: false }))}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium",
                      !present
                        ? "bg-brand-red text-brand-white"
                        : "bg-brand-black/5 text-brand-black/60",
                    )}
                  >
                    Absent
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {students.length > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={busy || pending}>
            {busy ? "Saving…" : "Save attendance"}
          </Button>
          {saved && (
            <span className="text-sm font-medium text-brand-black">Saved ✓</span>
          )}
        </div>
      )}
    </div>
  );
}

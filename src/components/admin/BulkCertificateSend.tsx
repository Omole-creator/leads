"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { certificateDefaults } from "@/lib/certificate";

export interface BulkCertificateStudent {
  id: string;
  fullName: string;
  trackName: string;
  email: string;
  studentStatus: string;
}

type Outcome = "pending" | "sending" | "sent" | "failed";

interface RowState {
  outcome: Outcome;
  error?: string;
}

// Resend allows ~2 requests/second. Each certificate also has to be rendered,
// which already takes about a second, so this pause is mostly belt and braces.
const PAUSE_MS = 600;

/**
 * Admin: email a batch of students their certificates.
 *
 * The list is EVERY enrolled student in the cohort, not just the ones marked
 * COMPLETED — a cohort can finish without every status having been updated, and
 * the admin should not have to go and mark people first. Everyone starts ticked
 * and anyone who isn't finished is simply removed before sending; each row shows
 * its status so it is obvious who those are.
 *
 * Deliberately driven from the browser, one student per request, reusing
 * `POST /api/certificates/send`. A server-side loop would render and email N
 * certificates inside a single serverless invocation and blow the function
 * timeout somewhere past a handful of students (attachments cannot use Resend's
 * batch endpoint, so there is no way to make that one fast call). Sending one at
 * a time also means a single failure can't take the whole run down, and the
 * admin gets real progress instead of a spinner.
 */
export function BulkCertificateSend({
  students,
  cohortLabel,
}: {
  students: BulkCertificateStudent[];
  cohortLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  // A ref, not state: the loop needs to read the current value between awaits,
  // and a state value captured at render time would always read stale.
  const stopRef = useRef(false);

  const selected = useMemo(
    () => students.filter((s) => !excluded.has(s.id)),
    [students, excluded],
  );

  const sent = Object.values(rows).filter((r) => r.outcome === "sent").length;
  const failed = Object.values(rows).filter((r) => r.outcome === "failed").length;
  const done = sent + failed;
  const finished = !running && done > 0;

  function mark(id: string, state: RowState) {
    setRows((r) => ({ ...r, [id]: state }));
  }

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Quick selections. "completed" keeps only students marked COMPLETED. */
  function selectOnly(which: "all" | "none" | "completed") {
    if (which === "all") return setExcluded(new Set());
    if (which === "none") return setExcluded(new Set(students.map((s) => s.id)));
    setExcluded(
      new Set(
        students.filter((s) => s.studentStatus !== "COMPLETED").map((s) => s.id),
      ),
    );
  }

  function reset() {
    setRows({});
    setStopped(false);
    setExcluded(new Set());
    stopRef.current = false;
  }

  async function run() {
    setRunning(true);
    setStopped(false);
    setRows({});
    stopRef.current = false;

    // Snapshot the selection so ticking a box mid-run can't change the batch.
    const batch = selected;

    for (const [i, s] of batch.entries()) {
      if (stopRef.current) break;

      mark(s.id, { outcome: "sending" });
      const fields = certificateDefaults(s.fullName, s.trackName);
      try {
        const res = await fetch("/api/certificates/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: s.id, ...fields }),
        });
        if (res.ok) {
          mark(s.id, { outcome: "sent" });
        } else {
          const data = await res.json().catch(() => ({}));
          mark(s.id, { outcome: "failed", error: data.error ?? `HTTP ${res.status}` });
        }
      } catch {
        mark(s.id, { outcome: "failed", error: "Network error" });
      }

      if (i < batch.length - 1 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
    }

    setRunning(false);
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No students enrolled in {cohortLabel} yet, so there is nothing to
        certify.
      </p>
    );
  }

  const completedCount = students.filter(
    (s) => s.studentStatus === "COMPLETED",
  ).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Don't let the dialog close mid-run — closing it unmounts the loop's
        // progress and the admin loses track of who was already emailed.
        if (running) return;
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          Email certificates in bulk ({students.length} student
          {students.length === 1 ? "" : "s"})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Send certificates</DialogTitle>
        <DialogDescription>
          Every student in {cohortLabel} is listed and ticked. Untick anyone who
          hasn&apos;t finished, then send the rest. Each one gets their own
          certificate dated today, as a PDF attachment. Sent one at a time, so
          keep this tab open until it finishes.
        </DialogDescription>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Quick pick:</span>
          <Button
            variant="outline"
            size="sm"
            disabled={running}
            onClick={() => selectOnly("all")}
          >
            All ({students.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={running}
            onClick={() => selectOnly("completed")}
          >
            Only completed ({completedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={running}
            onClick={() => selectOnly("none")}
          >
            None
          </Button>
        </div>

        <div className="mt-3 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-brand-black/10 p-2">
          {students.map((s) => {
            const state = rows[s.id]?.outcome ?? "pending";
            const isOn = !excluded.has(s.id);
            return (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-brand-black/5"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-brand-yellow"
                  checked={isOn}
                  disabled={running}
                  onChange={() => toggle(s.id)}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate font-medium ${isOn ? "" : "text-muted-foreground line-through"}`}
                  >
                    {s.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.trackName} · {s.studentStatus} · {s.email}
                  </p>
                </div>
                <span
                  className={
                    state === "sent"
                      ? "text-xs font-medium text-brand-blue"
                      : state === "failed"
                        ? "text-xs font-medium text-brand-red"
                        : "text-xs text-muted-foreground"
                  }
                >
                  {state === "sent" && "Sent"}
                  {state === "sending" && "Sending…"}
                  {state === "failed" && (rows[s.id]?.error ?? "Failed")}
                  {state === "pending" && (isOn ? "—" : "Skipped")}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running || selected.length === 0}>
            {running
              ? `Sending ${Math.min(done + 1, selected.length)} of ${selected.length}…`
              : finished
                ? "Send again"
                : `Send ${selected.length} certificate${selected.length === 1 ? "" : "s"}`}
          </Button>
          {running && (
            <Button
              variant="outline"
              onClick={() => {
                stopRef.current = true;
                setStopped(true);
              }}
            >
              Stop after this one
            </Button>
          )}
          {(running || finished) && (
            <span className="text-sm text-muted-foreground">
              {sent} sent{failed > 0 ? `, ${failed} failed` : ""}
              {stopped && !running ? " (stopped early)" : ""}
            </span>
          )}
          {!running && !finished && excluded.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {excluded.size} removed
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

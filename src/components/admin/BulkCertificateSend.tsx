"use client";

import { useRef, useState } from "react";
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
 * Admin: email every COMPLETED student in the current cohort their certificate.
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
  // A ref, not state: the loop needs to read the current value between awaits,
  // and a state value captured at render time would always read stale.
  const stopRef = useRef(false);

  const sent = Object.values(rows).filter((r) => r.outcome === "sent").length;
  const failed = Object.values(rows).filter((r) => r.outcome === "failed").length;
  const done = sent + failed;
  const finished = !running && done > 0;

  function mark(id: string, state: RowState) {
    setRows((r) => ({ ...r, [id]: state }));
  }

  async function run() {
    setRunning(true);
    setStopped(false);
    setRows({});
    stopRef.current = false;

    for (const [i, s] of students.entries()) {
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

      if (i < students.length - 1 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, PAUSE_MS));
      }
    }

    setRunning(false);
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No completed students in {cohortLabel} yet. Mark a student
        &ldquo;COMPLETED&rdquo; and they show up here.
      </p>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Don't let the dialog close mid-run — closing it unmounts the loop's
        // progress and the admin loses track of who was already emailed.
        if (running) return;
        setOpen(v);
        if (!v) {
          setRows({});
          setStopped(false);
          stopRef.current = false;
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          Email certificates to {students.length} completed student
          {students.length === 1 ? "" : "s"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogTitle>Send {students.length} certificates</DialogTitle>
        <DialogDescription>
          Every COMPLETED student in {cohortLabel} gets their own certificate,
          dated today, as a PDF attachment. Sent one at a time, so keep this tab
          open until it finishes.
        </DialogDescription>

        <div className="mt-4 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-brand-black/10 p-2">
          {students.map((s) => {
            const state = rows[s.id]?.outcome ?? "pending";
            return (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.trackName} · {s.email}
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
                  {state === "pending" && "—"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={run} disabled={running}>
            {running
              ? `Sending ${done + 1} of ${students.length}…`
              : finished
                ? "Send again"
                : "Start sending"}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

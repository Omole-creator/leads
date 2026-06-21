"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { STAGES, STAGE_LABELS } from "@/lib/constants";

interface Opt {
  id: string;
  name: string;
}

export function EmailComposer({
  tracks,
  cohorts,
  segments,
}: {
  tracks: Opt[];
  cohorts: Opt[];
  segments: string[];
}) {
  const [segment, setSegment] = useState("");
  const [trackId, setTrackId] = useState("");
  const [stage, setStage] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    "Hi {{firstName}},\n\n",
  );
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const query = () => {
    const p = new URLSearchParams();
    if (segment) p.set("segment", segment);
    if (trackId) p.set("trackId", trackId);
    if (stage) p.set("stage", stage);
    if (cohortId) p.set("cohortId", cohortId);
    return p.toString();
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/leads?${query()}`)
      .then((r) => r.json())
      .then((leads) => {
        if (!active) return;
        const emails = new Set(
          (leads as { email: string }[]).map((l) => l.email.toLowerCase().trim()),
        );
        setCount(emails.size);
      })
      .catch(() => active && setCount(null));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment, trackId, stage, cohortId]);

  async function send() {
    setError("");
    setResult("");
    if (!confirm(`Send this email to ${count ?? 0} recipient(s)?`)) return;
    setBusy(true);
    const res = await fetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, trackId, stage, cohortId, subject, body }),
    });
    setBusy(false);
    if (res.ok) {
      const r = await res.json();
      setResult(`Sent ${r.sent}, failed ${r.failed} (to ${r.recipients} recipients).`);
    } else {
      setError((await res.json()).error ?? "Send failed");
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-lg border border-brand-black/10 p-4">
        <p className="mb-3 text-sm font-medium">1. Choose who to email</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {segments.length > 1 && (
            <Field label="Segment">
              <Select value={segment} onChange={(e) => setSegment(e.target.value)}>
                <option value="">All</option>
                {segments.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Track">
            <Select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
              <option value="">All</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cohort">
            <Select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              <option value="">All</option>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-sm font-medium text-brand-black">
          {count === null ? "…" : count} recipient(s) match
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-brand-black/10 p-4">
        <p className="text-sm font-medium">2. Write the message</p>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Personalize with <code>{"{{firstName}}"}</code>,{" "}
          <code>{"{{name}}"}</code>, <code>{"{{track}}"}</code>. Sent from
          contact@jobmingle.co; replies come back there.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm font-medium text-brand-black">{result}</p>}

      <Button
        onClick={send}
        disabled={busy || !subject.trim() || !body.trim() || !count}
      >
        {busy ? "Sending…" : `Send to ${count ?? 0}`}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

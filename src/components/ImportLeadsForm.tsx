"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ImportLeadsForm({ cohorts }: { cohorts: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [csv, setCsv] = useState("");
  const [cohortName, setCohortName] = useState("");
  const [segment, setSegment] = useState("Scholarship");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setCsv);
  }

  async function submit() {
    setError("");
    setMsg("");
    setBusy(true);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, cohortName, segment }),
    });
    setBusy(false);
    if (res.ok) {
      const r = await res.json();
      setMsg(`Imported ${r.created} lead(s), skipped ${r.skipped}.`);
      setCsv("");
      start(() => router.refresh());
    } else {
      setError((await res.json()).error ?? "Import failed");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-lg border border-brand-black/10 bg-brand-black/[0.02] p-4 text-sm">
        <p className="font-medium">CSV columns (header row required)</p>
        <p className="mt-1 text-muted-foreground">
          <code>Full Name, Email, Phone, Track</code> — extra columns are ignored.
          Rows without a name or valid email are skipped. Imported leads are{" "}
          <strong>unassigned</strong> (admin-only) until you assign them.
        </p>
      </div>

      <Field label="Upload CSV file">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-black file:px-3 file:py-2 file:text-brand-white"
        />
      </Field>

      <Field label="…or paste CSV">
        <Textarea
          rows={6}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"Full Name,Email,Phone,Track\nJane Doe,jane@x.com,08012345678,Data Analysis"}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Segment (label)">
          <Input
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="Scholarship"
          />
        </Field>
        <Field label="Cohort">
          <Input
            list="cohort-options"
            value={cohortName}
            onChange={(e) => setCohortName(e.target.value)}
            placeholder="e.g. Scholarship Batch 1"
          />
          <datalist id="cohort-options">
            {cohorts.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm font-medium text-brand-black">{msg}</p>}

      <Button
        onClick={submit}
        disabled={busy || pending || !csv.trim() || !cohortName.trim()}
      >
        {busy ? "Importing…" : "Import leads"}
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

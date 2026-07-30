"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Vercel caps the request body around 4.5MB and the CSV is posted as JSON, so
// stop a huge file here with a message rather than at the edge with a 413.
const MAX_CSV_BYTES = 4_000_000;

export function OutreachImportForm({ batches }: { batches: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [csv, setCsv] = useState("");
  const [batchName, setBatchName] = useState("");
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_CSV_BYTES) {
      setError("That file is over 4MB. Split it and import in two goes.");
      return;
    }
    file.text().then(setCsv);
  }

  async function submit() {
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/outreach/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, batchName, updateExisting }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setMsg(
          `Imported ${data.created} new contact(s)` +
            (data.updated ? `, updated ${data.updated}` : "") +
            `, skipped ${data.skipped}.`,
        );
        setCsv("");
        start(() => router.refresh());
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-brand-black/10 p-4">
      <div>
        <h2 className="text-base font-semibold">Import contacts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A row only needs an email. Anything missing is left blank, and the
          email templates fall back to wording that still reads properly.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="CSV file">
          <Input type="file" accept=".csv,text/csv" onChange={onFile} />
        </Field>
        <Field label="Batch name" wide>
          <Input
            list="outreach-batches"
            placeholder="LinkedIn HR scrape, 31 Jul"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
          />
          <datalist id="outreach-batches">
            {batches.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>
      </div>

      <Textarea
        rows={5}
        placeholder="…or paste CSV here: First Name,Company,Job Title,Email,Industry,Hiring Role"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-brand-yellow"
          checked={updateExisting}
          onChange={(e) => setUpdateExisting(e.target.checked)}
        />
        Update contacts that already exist (matched on email) and move them into
        this batch
      </label>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">Which column names work?</summary>
        <ul className="mt-2 space-y-1">
          <li>
            <strong>Email</strong>: email, email address, e-mail, work email
          </li>
          <li>
            <strong>First name</strong>: first name, firstname, first, name
          </li>
          <li>
            <strong>Company</strong>: company, company name, organisation
          </li>
          <li>
            <strong>Job title</strong>: job title, title, role, position
          </li>
          <li>
            <strong>Industry</strong>: industry, sector, vertical
          </li>
          <li>
            <strong>Company size</strong>: company size, size, headcount
          </li>
          <li>
            <strong>Location</strong>: location, city, country
          </li>
          <li>
            <strong>Hiring role</strong>: hiring role, open role, vacancy
          </li>
          <li>
            <strong>Hiring source</strong>: hiring source, source, found via
          </li>
          <li>
            <strong>Trigger</strong>: trigger, trigger event, signal
          </li>
          <li>
            <strong>Personalization</strong>: personalization, note, notes
          </li>
        </ul>
      </details>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}

      <Button
        onClick={submit}
        disabled={busy || pending || !csv.trim() || !batchName.trim()}
      >
        {busy ? "Importing…" : "Import"}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "w-64" : "w-44"}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

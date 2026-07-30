"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  OutreachFilterBar,
  type OutreachFacets,
  type OutreachFiltersDTO,
} from "./OutreachFilterBar";

export interface ContactRow {
  id: string;
  email: string;
  firstName: string | null;
  companyName: string | null;
  jobTitle: string | null;
  industry: string | null;
  companySize: string | null;
  location: string | null;
  hiringRoles: string | null;
  hiringSource: string | null;
  triggerEvent: string | null;
  personalization: string | null;
  batchId: string | null;
  batchName: string | null;
  importedAt: string;
  unsubscribed: boolean;
  lastEmailedAt: string | null;
}

export interface BatchOption {
  id: string;
  name: string;
}

/** Turn the filter object back into the query string the page reads. */
export function filtersToQuery(f: OutreachFiltersDTO): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (k === "require") continue;
    if (v === undefined || v === "" || v === false) continue;
    sp.set(k, v === true ? "1" : String(v));
  }
  if (f.require?.length) sp.set("require", f.require.join(","));
  return sp.toString();
}

const EMPTY_DRAFT = {
  email: "",
  firstName: "",
  companyName: "",
  jobTitle: "",
  industry: "",
  companySize: "",
  location: "",
  hiringRoles: "",
  hiringSource: "",
  triggerEvent: "",
  personalization: "",
};

type Draft = typeof EMPTY_DRAFT;

export function OutreachContactsManager({
  contacts,
  total,
  batches,
  facets,
  filters,
}: {
  contacts: ContactRow[];
  total: number;
  batches: BatchOption[];
  facets: OutreachFacets;
  filters: OutreachFiltersDTO;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const refresh = () => start(() => router.refresh());
  const query = filtersToQuery(filters);

  function applyFilters(next: OutreachFiltersDTO) {
    const qs = filtersToQuery(next);
    start(() => router.push(qs ? `/admin/outreach?${qs}` : "/admin/outreach"));
  }

  async function create() {
    setError("");
    const res = await fetch("/api/outreach/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft(EMPTY_DRAFT);
      setAdding(false);
      refresh();
    } else {
      setError((await res.json()).error ?? "Failed to add contact");
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/outreach/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditing(null);
      refresh();
    } else {
      setError((await res.json()).error ?? "Failed to save");
    }
  }

  async function remove(c: ContactRow) {
    if (!confirm(`Delete ${c.email}? This cannot be undone.`)) return;
    await fetch(`/api/outreach/contacts/${c.id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-5">
      <OutreachFilterBar
        facets={facets}
        batches={batches}
        value={filters}
        onChange={applyFilters}
        showUnsubscribedToggle
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total} contact{total === 1 ? "" : "s"} match
          {contacts.length < total ? ` (showing ${contacts.length})` : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add contact"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = `/api/outreach/contacts/export${query ? `?${query}` : ""}`;
            }}
          >
            Export {total} to CSV
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {adding && (
        <ContactForm
          draft={draft}
          onChange={setDraft}
          onSave={create}
          onCancel={() => {
            setAdding(false);
            setDraft(EMPTY_DRAFT);
          }}
          saveLabel="Add contact"
        />
      )}

      {contacts.length === 0 ? (
        <p className="rounded-xl border border-brand-black/10 p-6 text-sm text-muted-foreground">
          No contacts match. Import a CSV below to get started.
        </p>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-brand-black/10 sm:block">
            <table className="w-full text-sm">
              <thead className="bg-brand-black/[0.03] text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Hiring for</th>
                  <th className="px-4 py-3 font-medium">Batch</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t border-brand-black/5 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {c.firstName ?? <Missing />}
                        {c.unsubscribed && (
                          <Badge className="ml-2 border-red-200 bg-red-50 text-red-700">
                            Unsubscribed
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.jobTitle ?? <Missing />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{c.companyName ?? <Missing />}</div>
                      <div className="text-xs text-muted-foreground">
                        {[c.industry, c.companySize, c.location]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{c.hiringRoles ?? <Missing />}</div>
                      {c.triggerEvent && (
                        <div className="text-xs text-muted-foreground">
                          {c.triggerEvent}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.batchName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{c.importedAt.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <RowActions
                        contact={c}
                        editing={editing === c.id}
                        onEdit={() => setEditing(editing === c.id ? null : c.id)}
                        onPatch={patch}
                        onRemove={remove}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-3 sm:hidden">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-brand-black/10 p-4 text-sm"
              >
                <div className="font-medium">
                  {c.firstName ?? <Missing />}
                  {c.unsubscribed && (
                    <Badge className="ml-2 border-red-200 bg-red-50 text-red-700">
                      Unsubscribed
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{c.email}</div>
                <div className="mt-2">{c.companyName ?? <Missing />}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.jobTitle, c.industry, c.location].filter(Boolean).join(" · ") ||
                    "—"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Hiring: {c.hiringRoles ?? "unknown"} · {c.batchName ?? "no batch"} ·{" "}
                  {c.importedAt.slice(0, 10)}
                </div>
                <div className="mt-3">
                  <RowActions
                    contact={c}
                    editing={editing === c.id}
                    onEdit={() => setEditing(editing === c.id ? null : c.id)}
                    onPatch={patch}
                    onRemove={remove}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <EditPanel
          contact={contacts.find((c) => c.id === editing)!}
          batches={batches}
          onSave={(body) => patch(editing, body)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

const Missing = () => (
  <span className="text-muted-foreground/60">not given</span>
);

function RowActions({
  contact,
  editing,
  onEdit,
  onPatch,
  onRemove,
}: {
  contact: ContactRow;
  editing: boolean;
  onEdit: () => void;
  onPatch: (id: string, body: Record<string, unknown>) => void;
  onRemove: (c: ContactRow) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="ghost" onClick={onEdit}>
        {editing ? "Close" : "Edit"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onPatch(contact.id, { unsubscribed: !contact.unsubscribed })
        }
      >
        {contact.unsubscribed ? "Resubscribe" : "Unsubscribe"}
      </Button>
      <Button size="sm" variant="destructive" onClick={() => onRemove(contact)}>
        Delete
      </Button>
    </div>
  );
}

function EditPanel({
  contact,
  batches,
  onSave,
  onCancel,
}: {
  contact: ContactRow;
  batches: BatchOption[];
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    email: contact.email,
    firstName: contact.firstName ?? "",
    companyName: contact.companyName ?? "",
    jobTitle: contact.jobTitle ?? "",
    industry: contact.industry ?? "",
    companySize: contact.companySize ?? "",
    location: contact.location ?? "",
    hiringRoles: contact.hiringRoles ?? "",
    hiringSource: contact.hiringSource ?? "",
    triggerEvent: contact.triggerEvent ?? "",
    personalization: contact.personalization ?? "",
  });
  const [batchId, setBatchId] = useState(contact.batchId ?? "");

  return (
    <ContactForm
      draft={draft}
      onChange={setDraft}
      onSave={() => onSave({ ...draft, batchId: batchId || null })}
      onCancel={onCancel}
      saveLabel="Save changes"
      title={`Editing ${contact.email}`}
      extra={
        <Field label="Batch">
          <Select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">— No batch —</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      }
    />
  );
}

function ContactForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saveLabel,
  title,
  extra,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  title?: string;
  extra?: React.ReactNode;
}) {
  const set = (k: keyof Draft, v: string) => onChange({ ...draft, [k]: v });
  return (
    <div className="space-y-3 rounded-xl border border-brand-black/10 p-4">
      {title && <p className="text-sm font-medium">{title}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Email (required)" wide>
          <Input value={draft.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="First name">
          <Input
            value={draft.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </Field>
        <Field label="Company">
          <Input
            value={draft.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </Field>
        <Field label="Job title">
          <Input
            value={draft.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
          />
        </Field>
        <Field label="Industry">
          <Input
            value={draft.industry}
            onChange={(e) => set("industry", e.target.value)}
          />
        </Field>
        <Field label="Company size">
          <Input
            value={draft.companySize}
            onChange={(e) => set("companySize", e.target.value)}
          />
        </Field>
        <Field label="Location">
          <Input
            value={draft.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>
        <Field label="Hiring role(s)">
          <Input
            value={draft.hiringRoles}
            onChange={(e) => set("hiringRoles", e.target.value)}
          />
        </Field>
        <Field label="Hiring source">
          <Input
            value={draft.hiringSource}
            onChange={(e) => set("hiringSource", e.target.value)}
          />
        </Field>
        <Field label="Trigger event">
          <Input
            value={draft.triggerEvent}
            onChange={(e) => set("triggerEvent", e.target.value)}
          />
        </Field>
        <Field label="Personalization note" wide>
          <Input
            value={draft.personalization}
            onChange={(e) => set("personalization", e.target.value)}
          />
        </Field>
        {extra}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={!draft.email.trim()}>
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
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

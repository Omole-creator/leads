"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bodyToHtml, renderTemplate } from "@/lib/email-template";
import {
  SENDER_IDENTITIES,
  type SenderIdentityId,
} from "@/lib/outreach-constants";
import {
  OUTREACH_SAMPLE_VARS,
  OUTREACH_VARIANTS,
  outreachFooter,
} from "@/lib/outreach-templates";
import {
  OutreachFilterBar,
  type OutreachFacets,
  type OutreachFiltersDTO,
} from "./OutreachFilterBar";
import {
  OutreachRecipientPicker,
  type RecipientRow,
} from "./OutreachRecipientPicker";
import { filtersToQuery } from "./OutreachContactsManager";

export interface OutreachDraftInit {
  id: string;
  subject: string;
  body: string;
  fromName: SenderIdentityId;
  variant: string | null;
  filters: OutreachFiltersDTO;
}

export function OutreachComposer({
  batches,
  facets,
  initial,
}: {
  batches: { id: string; name: string }[];
  facets: OutreachFacets;
  initial?: OutreachDraftInit;
}) {
  const router = useRouter();
  const [draftId, setDraftId] = useState(initial?.id ?? "");
  const [filters, setFilters] = useState<OutreachFiltersDTO>(
    initial?.filters ?? {},
  );
  const [fromName, setFromName] = useState<SenderIdentityId>(
    initial?.fromName ?? "LIMITED",
  );
  const [variant, setVariant] = useState<string | null>(initial?.variant ?? null);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const query = filtersToQuery(filters);

  // Re-fetch the matched contacts whenever the filters move. The list is the
  // send list, so what you see is exactly who receives it.
  useEffect(() => {
    let cancelled = false;
    setLoadingRecipients(true);
    fetch(`/api/outreach/contacts?fields=recipient${query ? `&${query}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setRecipients(d.contacts ?? []);
        setExcluded(new Set());
      })
      .catch(() => {
        if (!cancelled) setRecipients([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecipients(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const selected = useMemo(
    () => recipients.filter((r) => !excluded.has(r.id)),
    [recipients, excluded],
  );

  const previewHtml = useMemo(
    () =>
      bodyToHtml(renderTemplate(body, OUTREACH_SAMPLE_VARS), {
        footer: outreachFooter(),
      }),
    [body],
  );

  function loadVariant(id: string) {
    const v = OUTREACH_VARIANTS.find((x) => x.id === id);
    if (!v) return;
    setVariant(v.id);
    setSubject(v.subject);
    setBody(v.body);
    // The variant leans on specific fields, so tick the boxes that keep it
    // truthful. Undo them by hand if you want a wider list.
    setFilters((f) => ({
      ...f,
      require: [...new Set([...(f.require ?? []), ...v.requires])],
    }));
    setShowPreview(true);
  }

  function toggle(id: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveDraft() {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const payload = { subject, body, fromName, variant, filters };
      const res = await fetch(
        draftId ? `/api/outreach/campaigns/${draftId}` : "/api/outreach/campaigns",
        {
          method: draftId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Could not save the draft");
      else {
        setDraftId(data.id);
        setResult("Draft saved.");
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!confirm(`Send this email to ${selected.length} contact(s)?`)) return;
    setBusy(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId || undefined,
          subject,
          body,
          fromName,
          variant,
          filters,
          contactIds: selected.map((r) => r.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Send failed");
      else {
        setResult(
          `Sent ${data.sent}, failed ${data.failed} (to ${data.recipients} contacts).`,
        );
        setDraftId("");
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. Choose who to email</h2>
        <OutreachFilterBar
          facets={facets}
          batches={batches}
          value={filters}
          onChange={setFilters}
          showRequirements
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. Check the list</h2>
        <OutreachRecipientPicker
          recipients={recipients}
          excluded={excluded}
          onToggle={toggle}
          onQuickPick={(which) =>
            setExcluded(
              which === "all" ? new Set() : new Set(recipients.map((r) => r.id)),
            )
          }
          disabled={busy}
          loading={loadingRecipients}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. Who it comes from</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Sender name">
            <Select
              value={fromName}
              onChange={(e) => setFromName(e.target.value as SenderIdentityId)}
            >
              {SENDER_IDENTITIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="pb-2 text-xs text-muted-foreground">
            This is the name shown before they open the email. All three send from
            the same address; only the name changes.
          </p>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-brand-black/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">4. Write the message</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? "Hide preview" : "Preview"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {OUTREACH_VARIANTS.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={variant === v.id ? "default" : "outline"}
              title={v.hint}
              onClick={() => loadVariant(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        {variant && (
          <p className="text-xs text-muted-foreground">
            {OUTREACH_VARIANTS.find((v) => v.id === variant)?.hint}
          </p>
        )}

        <Field label="Subject" wide>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </Field>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Message
          </span>
          <Textarea
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          Tokens: <code>{"{{first_name}}"}</code> <code>{"{{company}}"}</code>{" "}
          <code>{"{{job_title}}"}</code> <code>{"{{hiring_role}}"}</code>{" "}
          <code>{"{{industry}}"}</code> <code>{"{{trigger}}"}</code>{" "}
          <code>{"{{location}}"}</code> <code>{"{{personalization}}"}</code>.
          Give every one a fallback with a pipe, like{" "}
          <code>{"{{first_name|there}}"}</code>, so a contact with that field
          missing still reads properly. <code>**bold**</code> and{" "}
          <code>[label](url)</code> also work.
        </p>

        {showPreview && (
          <iframe
            title="Email preview"
            srcDoc={previewHtml}
            className="h-[520px] w-full rounded-lg border border-brand-black/10 bg-white"
          />
        )}
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && <p className="text-sm text-green-700">{result}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={send}
          disabled={busy || !subject.trim() || !body.trim() || selected.length === 0}
        >
          Send to {selected.length}
        </Button>
        <Button
          variant="outline"
          onClick={saveDraft}
          disabled={busy || !subject.trim() || !body.trim()}
        >
          Save draft
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
    <label className={`block ${wide ? "w-full max-w-xl" : "w-56"}`}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

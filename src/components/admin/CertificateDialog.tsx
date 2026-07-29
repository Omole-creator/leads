"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  certificateDefaults,
  certificateStatement,
  type CertificateFields,
} from "@/lib/certificate";

// The preview is a server render, so it is throttled while the admin types.
const PREVIEW_DEBOUNCE_MS = 450;

function renderUrl(fields: CertificateFields, extra: Record<string, string>) {
  return `/api/certificates/render?${new URLSearchParams({ ...fields, ...extra })}`;
}

/**
 * Admin: issue a Certificate of Completion for a student. Every field is
 * prefilled from the student and their track (and the date is always today),
 * but stays editable so a wrong track name or spelling can be fixed before the
 * certificate goes out.
 */
export function CertificateDialog({
  leadId,
  fullName,
  trackName,
}: {
  leadId: string;
  fullName: string;
  trackName: string;
}) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<CertificateFields>(() =>
    certificateDefaults(fullName, trackName),
  );
  const [preview, setPreview] = useState<CertificateFields>(fields);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Re-stamp today's date each time the dialog is opened, so a tab left open
  // overnight can't issue a certificate dated yesterday.
  useEffect(() => {
    if (!open) return;
    const fresh = certificateDefaults(fullName, trackName);
    setFields(fresh);
    setPreview(fresh);
    setResult(null);
  }, [open, fullName, trackName]);

  useEffect(() => {
    const t = setTimeout(() => setPreview(fields), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [fields]);

  const previewSrc = useMemo(
    () => renderUrl(preview, { format: "png" }),
    [preview],
  );

  const set = (key: keyof CertificateFields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }));

  const incomplete = Object.values(fields).some((v) => !v.trim());

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/certificates/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, ...fields }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(
        res.ok
          ? `Sent to ${data.to ?? "the student"}.`
          : (data.error ?? "Could not send the certificate."),
      );
    } catch {
      setResult("Could not reach the server.");
    }
    setSending(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Certificate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Certificate of Completion</DialogTitle>
        <DialogDescription>
          Prefilled from the student&apos;s record and dated today. Edit anything
          that reads wrong, then download it or email it straight to them.
        </DialogDescription>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Name
            </span>
            <Input
              value={fields.name}
              onChange={(e) => set("name")(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Course
            </span>
            <Input
              value={fields.course}
              onChange={(e) => set("course")(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Issued on
            </span>
            <Input
              value={fields.issuedOn}
              onChange={(e) => set("issuedOn")(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Industry
            </span>
            <Input
              value={fields.industry}
              onChange={(e) => set("industry")(e.target.value)}
            />
          </label>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {certificateStatement(fields.industry || "…")}
        </p>

        <div className="mt-4 overflow-hidden rounded-lg border border-brand-black/10 bg-brand-black/5">
          {/* Same route the download and the emailed PDF use, so this preview
              is the finished certificate, not an approximation. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Certificate preview"
            className="block h-auto w-full"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" disabled={incomplete}>
            <a
              href={renderUrl(fields, { format: "pdf", download: "1" })}
              target="_blank"
              rel="noreferrer"
            >
              Download PDF
            </a>
          </Button>
          <Button asChild variant="outline" disabled={incomplete}>
            <a
              href={renderUrl(fields, { format: "png", download: "1" })}
              target="_blank"
              rel="noreferrer"
            >
              Download image
            </a>
          </Button>
          <Button onClick={send} disabled={sending || incomplete}>
            {sending ? "Sending…" : "Email to student"}
          </Button>
          {result && (
            <span className="text-sm text-muted-foreground">{result}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

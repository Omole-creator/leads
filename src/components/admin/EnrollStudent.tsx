"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface Lead {
  id: string;
  fullName: string;
  cohort: string | null;
}

export function EnrollStudent({
  leads,
  tracks,
}: {
  leads: Lead[];
  tracks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [trackId, setTrackId] = useState("");

  async function enroll() {
    if (!leadId || !trackId) return;
    setBusy(true);
    const res = await fetch(`/api/students/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentTrackId: trackId, studentStatus: "ACTIVE" }),
    });
    setBusy(false);
    if (res.ok) {
      setLeadId("");
      setTrackId("");
      start(() => router.refresh());
    }
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every lead is already enrolled on a track.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Lead
        </span>
        <Select
          aria-label="Lead"
          className="w-60"
          value={leadId}
          disabled={busy || pending}
          onChange={(e) => setLeadId(e.target.value)}
        >
          <option value="">— Select a lead —</option>
          {leads.map((l) => (
            <option key={l.id} value={l.id}>
              {l.fullName}
              {l.cohort ? ` — ${l.cohort}` : ""}
            </option>
          ))}
        </Select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Track
        </span>
        <Select
          aria-label="Track"
          className="w-48"
          value={trackId}
          disabled={busy || pending}
          onChange={(e) => setTrackId(e.target.value)}
        >
          <option value="">— Select a track —</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      <Button onClick={enroll} disabled={busy || pending || !leadId || !trackId}>
        {busy ? "Enrolling…" : "Enroll"}
      </Button>
    </div>
  );
}

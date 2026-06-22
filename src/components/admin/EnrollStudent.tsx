"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Lead {
  id: string;
  fullName: string;
  email: string;
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
  const [query, setQuery] = useState("");
  const [leadId, setLeadId] = useState("");
  const [open, setOpen] = useState(false);
  const [trackId, setTrackId] = useState("");

  // Type a name to filter; show only the name (no cohort suffix).
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return leads
      .filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [query, leads]);

  function pick(l: Lead) {
    setLeadId(l.id);
    setQuery(l.fullName);
    setOpen(false);
  }

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
      setQuery("");
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
      <label className="relative block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Lead
        </span>
        <Input
          type="text"
          className="w-60"
          placeholder="Search by name…"
          value={query}
          autoComplete="off"
          disabled={busy || pending}
          onChange={(e) => {
            setQuery(e.target.value);
            setLeadId("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Delay so a click on a result registers before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-64 w-60 overflow-auto rounded-md border border-brand-black/15 bg-white py-1 shadow-lg">
            {matches.map((l) => (
              <li key={l.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-yellow/20"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(l)}
                >
                  <span className="block font-medium">{l.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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

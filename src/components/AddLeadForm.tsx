"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface Opt {
  id: string;
  name: string;
}

export function AddLeadForm({
  tracks,
  cohorts,
}: {
  tracks: Opt[];
  cohorts: Opt[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [f, setF] = useState({
    fullName: "",
    email: "",
    phone: "",
    trackSelected: tracks[0]?.name ?? "",
    startTimeline: cohorts[0]?.name ?? "",
    howFoundUs: "Manual entry",
  });

  function set(k: keyof typeof f, v: string) {
    setF((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    if (res.ok) {
      start(() => {
        router.push("/leads");
        router.refresh();
      });
    } else {
      setError((await res.json()).error ?? "Failed to add lead");
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <Field label="Full name">
        <Input value={f.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={f.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </Field>
      <Field label="Phone / WhatsApp">
        <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <Field label="Interested skill (track)">
        <Select
          value={f.trackSelected}
          onChange={(e) => set("trackSelected", e.target.value)}
        >
          {tracks.map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cohort / start timeline">
        <Select
          value={f.startTimeline}
          onChange={(e) => set("startTimeline", e.target.value)}
        >
          {cohorts.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="How did you hear">
        <Input
          value={f.howFoundUs}
          onChange={(e) => set("howFoundUs", e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          onClick={submit}
          disabled={pending || !f.fullName || !f.email || !f.trackSelected || !f.startTimeline}
        >
          Add lead
        </Button>
        <Button variant="outline" onClick={() => router.push("/leads")}>
          Cancel
        </Button>
      </div>
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

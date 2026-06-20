"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface CohortRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export function CohortsManager({ cohorts }: { cohorts: CohortRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const refresh = () => start(() => router.refresh());

  async function add() {
    setError("");
    const res = await fetch("/api/cohorts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, startDate, endDate }),
    });
    if (res.ok) {
      setName("");
      setStartDate("");
      setEndDate("");
      refresh();
    } else setError((await res.json()).error ?? "Failed to add cohort");
  }

  async function activate(id: string) {
    await fetch(`/api/cohorts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-black/10 p-4">
        <Field label="Name" wide>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Start date">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
        <Button onClick={add} disabled={!name || !startDate || !endDate}>
          Add cohort
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Start</th>
              <th className="px-4 py-3 font-medium">End</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id} className="border-t border-brand-black/5">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{new Date(c.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">{new Date(c.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {c.active ? (
                    <Badge className="border-green-200 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="border-gray-200 bg-gray-100 text-gray-600">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!c.active && (
                    <Button size="sm" variant="outline" onClick={() => activate(c.id)}>
                      Set active
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

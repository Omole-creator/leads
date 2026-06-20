"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatNaira } from "@/lib/utils";

export interface TrackRow {
  id: string;
  name: string;
  cost: number;
  active: boolean;
}

export function TracksManager({ tracks }: { tracks: TrackRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [error, setError] = useState("");
  const refresh = () => start(() => router.refresh());

  async function add() {
    setError("");
    const res = await fetch("/api/tracks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cost: Number(cost) }),
    });
    if (res.ok) {
      setName("");
      setCost("");
      refresh();
    } else setError((await res.json()).error ?? "Failed to add track");
  }

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/tracks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-black/10 p-4">
        <Field label="Track name" wide>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Cost (₦)">
          <Input
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </Field>
        <Button onClick={add} disabled={!name || !cost}>
          Add track
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Track</th>
              <th className="px-4 py-3 font-medium">Cost</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tracks.map((t) => (
              <tr key={t.id} className="border-t border-brand-black/5">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">{formatNaira(t.cost)}</td>
                <td className="px-4 py-3">
                  {t.active ? (
                    <Badge className="border-green-200 bg-green-50 text-green-700">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="border-gray-200 bg-gray-100 text-gray-600">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <EditCost track={t} onSave={(v) => patch(t.id, { cost: v })} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patch(t.id, { active: !t.active })}
                    >
                      {t.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditCost({
  track,
  onSave,
}: {
  track: TrackRow;
  onSave: (cost: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(track.cost));
  if (!editing)
    return (
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        Edit cost
      </Button>
    );
  return (
    <span className="flex items-center gap-1">
      <Input
        type="number"
        className="h-8 w-28"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        size="sm"
        onClick={() => {
          onSave(Number(value));
          setEditing(false);
        }}
      >
        Save
      </Button>
    </span>
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

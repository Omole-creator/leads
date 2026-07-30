"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface BatchRow {
  id: string;
  name: string;
  note: string | null;
  importedAt: string;
  contactCount: number;
}

export function OutreachBatchesManager({ batches }: { batches: BatchRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const refresh = () => start(() => router.refresh());

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/outreach/batches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditing(null);
      refresh();
    } else {
      setError((await res.json()).error ?? "Failed to save batch");
    }
  }

  async function remove(b: BatchRow, withContacts: boolean) {
    setError("");
    if (
      withContacts &&
      !confirm(
        `Delete "${b.name}" and its ${b.contactCount} contact(s)? This cannot be undone.`,
      )
    )
      return;

    const res = await fetch(
      `/api/outreach/batches/${b.id}${withContacts ? "?withContacts=1" : ""}`,
      { method: "DELETE" },
    );
    if (res.ok) refresh();
    else setError((await res.json()).error ?? "Failed to delete batch");
  }

  if (batches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Batches</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Batch</th>
              <th className="px-4 py-3 font-medium">Imported</th>
              <th className="px-4 py-3 font-medium">Contacts</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-t border-brand-black/5">
                <td className="px-4 py-3">
                  {editing === b.id ? (
                    <EditBatch batch={b} onSave={(body) => patch(b.id, body)} />
                  ) : (
                    <>
                      <div className="font-medium">{b.name}</div>
                      {b.note && (
                        <div className="text-xs text-muted-foreground">{b.note}</div>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{b.importedAt.slice(0, 10)}</td>
                <td className="px-4 py-3">{b.contactCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(editing === b.id ? null : b.id)}
                    >
                      {editing === b.id ? "Cancel" : "Edit"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => remove(b, false)}
                    >
                      Delete batch
                    </Button>
                    {b.contactCount > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => remove(b, true)}
                      >
                        Delete with contacts
                      </Button>
                    )}
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

function EditBatch({
  batch,
  onSave,
}: {
  batch: BatchRow;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(batch.name);
  const [note, setNote] = useState(batch.note ?? "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="h-8 w-48"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        className="h-8 w-56"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button size="sm" onClick={() => onSave({ name, note })} disabled={!name.trim()}>
        Save
      </Button>
    </div>
  );
}

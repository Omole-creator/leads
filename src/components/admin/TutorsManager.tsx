"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface TutorRow {
  id: string;
  name: string;
  email: string;
  active: boolean;
  tracks: string[];
}

export function TutorsManager({ tutors }: { tutors: TutorRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const refresh = () => start(() => router.refresh());

  async function add() {
    setError("");
    const res = await fetch("/api/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role: "TUTOR" }),
    });
    if (res.ok) {
      setName("");
      setEmail("");
      refresh();
    } else setError((await res.json()).error ?? "Failed to add tutor");
  }

  async function toggle(t: TutorRow) {
    await fetch(`/api/reps/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !t.active }),
    });
    refresh();
  }

  async function remove(t: TutorRow) {
    setError("");
    const res = await fetch(`/api/reps/${t.id}`, { method: "DELETE" });
    if (res.ok) refresh();
    else setError((await res.json()).error ?? "Failed to delete tutor");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-black/10 p-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email (Google)">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button onClick={add} disabled={!name || !email}>
          Add tutor
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Tracks</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map((t) => (
              <tr key={t.id} className="border-t border-brand-black/5">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">{t.email}</td>
                <td className="px-4 py-3">
                  {t.tracks.length ? t.tracks.join(", ") : (
                    <span className="text-muted-foreground">none</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      t.active
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                    }
                  >
                    {t.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggle(t)}>
                      {t.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(t)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {tutors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No tutors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block w-52">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

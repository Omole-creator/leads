"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface RepRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
  active: boolean;
}

export function RepsManager({ reps }: { reps: RepRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SALES_REP">("SALES_REP");
  const [error, setError] = useState("");

  const refresh = () => start(() => router.refresh());

  async function add() {
    setError("");
    const res = await fetch("/api/reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    });
    if (res.ok) {
      setName("");
      setEmail("");
      refresh();
    } else {
      setError((await res.json()).error ?? "Failed to add rep");
    }
  }

  async function toggleActive(rep: RepRow) {
    await fetch(`/api/reps/${rep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rep.active }),
    });
    refresh();
  }

  async function remove(rep: RepRow) {
    setError("");
    const res = await fetch(`/api/reps/${rep.id}`, { method: "DELETE" });
    if (res.ok) refresh();
    else setError((await res.json()).error ?? "Failed to delete rep");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-black/10 p-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "SALES_REP")}>
            <option value="SALES_REP">Sales Rep</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        <Button onClick={add} disabled={!name || !email}>
          Add rep
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-brand-black/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-black/[0.03] text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => (
              <tr key={rep.id} className="border-t border-brand-black/5">
                <td className="px-4 py-3 font-medium">{rep.name}</td>
                <td className="px-4 py-3">{rep.email}</td>
                <td className="px-4 py-3">{rep.role === "ADMIN" ? "Admin" : "Sales Rep"}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={
                      rep.active
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                    }
                  >
                    {rep.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(rep)}>
                      {rep.active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(rep)}>
                      Delete
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block w-44">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

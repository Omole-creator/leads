"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatNaira } from "@/lib/utils";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

interface Closer {
  id: string;
  name: string;
}

export function CloserCommissionPanel({ closers }: { closers: Closer[] }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(today));
  const [byRep, setByRep] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/commission?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        const map: Record<string, number> = {};
        (d.perRep ?? []).forEach((r: { repId: string; amount: number }) => {
          map[r.repId] = r.amount;
        });
        setByRep(map);
        setTotal(d.total ?? 0);
      })
      .catch(() => active && setByRep({}));
    return () => {
      active = false;
    };
  }, [from, to]);

  return (
    <div className="rounded-xl border border-brand-black/10 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Commission to pay</h2>
          <p className="text-sm text-muted-foreground">
            Total for period: <strong>{formatNaira(total)}</strong>
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              From 📅
            </span>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              To 📅
            </span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
          </label>
        </div>
      </div>

      <ul className="mt-4 divide-y divide-brand-black/5">
        {closers.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className="font-medium">{c.name}</span>
            <span className="font-semibold">{formatNaira(byRep[c.id] ?? 0)}</span>
          </li>
        ))}
        {closers.length === 0 && (
          <li className="py-2 text-sm text-muted-foreground">No closers yet.</li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function CommissionRange({ label }: { label: string }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(today));
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/commission?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => active && setAmount(d.total ?? 0))
      .catch(() => active && setAmount(null));
    return () => {
      active = false;
    };
  }, [from, to]);

  return (
    <Card className="border-l-4 border-l-brand-yellow">
      <CardContent className="flex flex-wrap items-end gap-4 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold text-brand-black">
            {amount === null ? "…" : formatNaira(amount)}
          </p>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              From 📅
            </span>
            <Input
              type="date"
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-40"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              To 📅
            </span>
            <Input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-40"
            />
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

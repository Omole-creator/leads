"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function DeleteLeadButton({
  leadId,
  leadName,
}: {
  leadId: string;
  leadName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  async function remove() {
    if (!confirm(`Delete lead "${leadName}"? This cannot be undone.`)) return;
    setError("");
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      start(() => {
        router.push("/leads");
        router.refresh();
      });
    } else {
      setError((await res.json()).error ?? "Failed to delete lead");
    }
  }

  return (
    <div>
      <Button
        variant="destructive"
        size="sm"
        onClick={remove}
        disabled={pending}
      >
        Delete lead
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

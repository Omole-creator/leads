"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function OutreachDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function remove() {
    if (!confirm("Delete this email? This cannot be undone.")) return;
    await fetch(`/api/outreach/campaigns/${id}`, { method: "DELETE" });
    start(() => router.refresh());
  }

  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
      Delete
    </Button>
  );
}

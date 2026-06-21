"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function EmailDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function remove() {
    if (!confirm("Delete this email? This cannot be undone.")) return;
    const res = await fetch(`/api/emails/${id}`, { method: "DELETE" });
    if (res.ok) start(() => router.refresh());
  }

  return (
    <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
      Delete
    </Button>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface NoteItem {
  id: string;
  body: string;
  createdAt: string | Date;
  author: { name: string };
}

export function NotesPanel({
  leadId,
  notes,
}: {
  leadId: string;
  notes: NoteItem[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  async function submit() {
    if (!body.trim()) return;
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setBody("");
      start(() => router.refresh());
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea
          placeholder="Add a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
          Add note
        </Button>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-brand-black/10 p-3 text-sm">
            <p className="whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {n.author.name} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-sm text-muted-foreground">No notes yet.</li>
        )}
      </ul>
    </div>
  );
}

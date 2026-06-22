"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { STUDENT_STATUSES } from "@/lib/constants";

export function StudentControls({
  leadId,
  status,
  trackId,
  tracks,
}: {
  leadId: string;
  status: string;
  trackId: string | null;
  tracks: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/students/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) start(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        aria-label="Track"
        className="h-8 w-40 text-xs"
        value={trackId ?? ""}
        disabled={pending}
        onChange={(e) => patch({ studentTrackId: e.target.value || null })}
      >
        <option value="">— No track —</option>
        {tracks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Status"
        className="h-8 w-32 text-xs"
        value={status}
        disabled={pending}
        onChange={(e) => patch({ studentStatus: e.target.value })}
      >
        {STUDENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </option>
        ))}
      </Select>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Remove this student from the tutor? Lead history is kept.")) {
            patch({ studentTrackId: null });
          }
        }}
        className="h-8 rounded-md border border-brand-red/40 px-3 text-xs font-medium text-brand-red hover:bg-brand-red/10 disabled:opacity-50"
      >
        Remove
      </button>
    </div>
  );
}

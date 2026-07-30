"use client";

import { Button } from "@/components/ui/button";

export interface RecipientRow {
  id: string;
  email: string;
  firstName: string | null;
  companyName: string | null;
  jobTitle: string | null;
}

/**
 * Everyone the filters matched, pre-ticked, each one removable. Selection is
 * held as the set of REMOVED ids (same idea as BulkCertificateSend), so a newly
 * matched contact is included by default rather than silently left out.
 */
export function OutreachRecipientPicker({
  recipients,
  excluded,
  onToggle,
  onQuickPick,
  disabled,
  loading,
}: {
  recipients: RecipientRow[];
  excluded: Set<string>;
  onToggle: (id: string) => void;
  onQuickPick: (which: "all" | "none") => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading recipients…</p>
    );
  }
  if (recipients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No contacts match these filters yet.
      </p>
    );
  }

  const kept = recipients.length - excluded.size;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs font-medium text-muted-foreground">
          Quick pick:
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onQuickPick("all")}
        >
          All ({recipients.length})
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onQuickPick("none")}
        >
          None
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {kept} selected
          {excluded.size > 0 ? `, ${excluded.size} removed` : ""}
        </span>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-brand-black/10 p-2">
        {recipients.map((r) => {
          const on = !excluded.has(r.id);
          return (
            <label
              key={r.id}
              className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-brand-black/[0.03]"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-brand-yellow"
                checked={on}
                disabled={disabled}
                onChange={() => onToggle(r.id)}
              />
              <span className="min-w-0 text-sm">
                <span
                  className={
                    on ? "font-medium" : "font-medium text-muted-foreground line-through"
                  }
                >
                  {r.firstName ?? r.email}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[r.companyName, r.jobTitle, r.email].filter(Boolean).join(" · ")}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

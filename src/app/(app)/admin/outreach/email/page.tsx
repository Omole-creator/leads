import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { outreachFacets } from "@/lib/outreach";
import {
  SENDER_IDENTITIES,
  type SenderIdentityId,
} from "@/lib/outreach-constants";
import {
  OutreachComposer,
  type OutreachDraftInit,
} from "@/components/admin/OutreachComposer";
import { OutreachDeleteButton } from "@/components/admin/OutreachDeleteButton";
import type { OutreachFiltersDTO } from "@/components/admin/OutreachFilterBar";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** Stored fromName is the display name; map it back to its id for the dropdown. */
function senderIdFromName(name: string): SenderIdentityId {
  return SENDER_IDENTITIES.find((s) => s.name === name)?.id ?? "LIMITED";
}

export default async function OutreachEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;

  const [batches, facets, campaigns, editing] = await Promise.all([
    prisma.outreachBatch.findMany({ orderBy: { importedAt: "desc" } }),
    outreachFacets(prisma),
    prisma.outreachCampaign.findMany({
      include: { sentBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    sp.draft
      ? prisma.outreachCampaign.findUnique({ where: { id: sp.draft } })
      : null,
  ]);

  const drafts = campaigns.filter((c) => c.status === "DRAFT");
  const sent = campaigns.filter((c) => c.status === "SENT");

  const initial: OutreachDraftInit | undefined =
    editing && editing.status === "DRAFT"
      ? {
          id: editing.id,
          subject: editing.subject,
          body: editing.body,
          fromName: senderIdFromName(editing.fromName),
          variant: editing.variant,
          filters: (editing.filters ?? {}) as OutreachFiltersDTO,
        }
      : undefined;

  const emailReady = !!(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Outreach email</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cold email to companies about recruitment. Course leads are not
            reachable from here.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/outreach">Back to contacts</Link>
        </Button>
      </div>

      {!emailReady && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL missing).
          You can still write and save drafts.
        </p>
      )}

      <OutreachComposer
        key={initial?.id ?? "new"}
        batches={batches.map((b) => ({ id: b.id, name: b.name }))}
        facets={facets}
        initial={initial}
      />

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Drafts</h2>
          <div className="divide-y divide-brand-black/5 rounded-xl border border-brand-black/10">
            {drafts.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{c.subject || "(no subject)"}</div>
                  <div className="text-xs text-muted-foreground">
                    Saved {c.createdAt.toISOString().slice(0, 10)} · from{" "}
                    {c.fromName}
                    {c.variant ? ` · variant ${c.variant}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/admin/outreach/email?draft=${c.id}`}>Edit</Link>
                  </Button>
                  <OutreachDeleteButton id={c.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Sent</h2>
          <div className="divide-y divide-brand-black/5 rounded-xl border border-brand-black/10">
            {sent.map((c) => (
              <details key={c.id} className="px-4 py-3 text-sm">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{c.subject}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.createdAt.toISOString().slice(0, 10)} · from {c.fromName} ·{" "}
                      {c.sentBy?.name ?? "unknown"} · {c.sent} sent
                      {c.failed ? `, ${c.failed} failed` : ""} of {c.recipients}
                    </span>
                  </span>
                  <OutreachDeleteButton id={c.id} />
                </summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-muted-foreground">
                  {c.body}
                </pre>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

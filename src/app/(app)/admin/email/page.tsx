import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { emailEnabled } from "@/lib/email";
import { EmailComposer, type DraftInit } from "@/components/EmailComposer";
import { EmailDeleteButton } from "@/components/EmailDeleteButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  const sp = await searchParams;

  const [tracks, cohorts, segmentRows, campaigns, editing] = await Promise.all([
    prisma.track.findMany({ orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
    prisma.lead.findMany({ distinct: ["segment"], select: { segment: true } }),
    prisma.emailCampaign.findMany({
      include: { sentBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    sp.draft
      ? prisma.emailCampaign.findUnique({ where: { id: sp.draft } })
      : Promise.resolve(null),
  ]);

  const drafts = campaigns.filter((c) => c.status === "DRAFT");
  const sent = campaigns.filter((c) => c.status === "SENT");

  const initial: DraftInit | undefined =
    editing && editing.status === "DRAFT"
      ? {
          id: editing.id,
          subject: editing.subject,
          body: editing.body,
          segment: editing.segment ?? "",
          trackId: editing.trackId ?? "",
          stage: editing.stage ?? "",
          cohortId: editing.cohortId ?? "",
        }
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Send email</h1>
        <p className="text-sm text-muted-foreground">
          Send a personalized email to a filtered group of leads, or save a draft
          for later.
        </p>
      </div>

      {!emailEnabled && (
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
          Email isn&apos;t configured yet — set <code>RESEND_API_KEY</code> and{" "}
          <code>RESEND_FROM_EMAIL</code>, then redeploy.
        </div>
      )}

      <EmailComposer
        key={initial?.id ?? "new"}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
        segments={segmentRows.map((r) => r.segment).sort()}
        initial={initial}
      />

      {drafts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Drafts</h2>
          <ul className="space-y-2">
            {drafts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-brand-black/10 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.subject || "(no subject)"}</p>
                  <p className="text-xs text-muted-foreground">
                    Saved {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/email?draft=${c.id}`}>Edit</Link>
                  </Button>
                  <EmailDeleteButton id={c.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sent emails</h2>
        {sent.length === 0 && (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        )}
        <ul className="space-y-2">
          {sent.map((c) => (
            <li key={c.id} className="rounded-lg border border-brand-black/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <details className="min-w-0 flex-1">
                  <summary className="cursor-pointer list-none">
                    <span className="font-medium">{c.subject}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()} ·{" "}
                      {c.sentBy?.name ?? "—"} · {c.sent} sent
                      {c.failed > 0 ? `, ${c.failed} failed` : ""} of {c.recipients}
                    </span>
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap border-t border-brand-black/10 pt-3 font-sans text-sm">
                    {c.body}
                  </pre>
                </details>
                <div className="shrink-0">
                  <EmailDeleteButton id={c.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

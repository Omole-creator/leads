import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { emailEnabled } from "@/lib/email";
import { EmailComposer } from "@/components/EmailComposer";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [tracks, cohorts, segmentRows, campaigns] = await Promise.all([
    prisma.track.findMany({ orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
    prisma.lead.findMany({ distinct: ["segment"], select: { segment: true } }),
    prisma.emailCampaign.findMany({
      include: { sentBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Send email</h1>
        <p className="text-sm text-muted-foreground">
          Send a personalized email to a filtered group of leads.
        </p>
      </div>

      {!emailEnabled && (
        <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
          Email isn&apos;t configured yet — set <code>RESEND_API_KEY</code> and{" "}
          <code>RESEND_FROM_EMAIL</code> in the environment, then redeploy.
        </div>
      )}

      <EmailComposer
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
        segments={segmentRows.map((r) => r.segment).sort()}
      />

      <section className="space-y-3 pt-4">
        <h2 className="text-lg font-semibold">Past emails</h2>
        {campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        )}
        <ul className="space-y-2">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-brand-black/10 p-4"
            >
              <details>
                <summary className="cursor-pointer list-none">
                  <span className="font-medium">{c.subject}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()} ·{" "}
                    {c.sentBy?.name ?? "—"} · {c.sent} sent
                    {c.failed > 0 ? `, ${c.failed} failed` : ""} of{" "}
                    {c.recipients}
                  </span>
                </summary>
                <pre className="mt-3 whitespace-pre-wrap border-t border-brand-black/10 pt-3 font-sans text-sm">
                  {c.body}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

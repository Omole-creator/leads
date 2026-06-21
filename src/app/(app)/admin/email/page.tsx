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

  const [tracks, cohorts, segmentRows] = await Promise.all([
    prisma.track.findMany({ orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
    prisma.lead.findMany({ distinct: ["segment"], select: { segment: true } }),
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
    </div>
  );
}

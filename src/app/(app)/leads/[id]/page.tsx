import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getLeadDetail } from "@/lib/leads";
import { canAccessLead } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageControl } from "@/components/StageControl";
import { FollowUpChecklist } from "@/components/FollowUpChecklist";
import { NotesPanel } from "@/components/NotesPanel";
import { ReassignControl } from "@/components/ReassignControl";
import { DeleteLeadButton } from "@/components/DeleteLeadButton";
import { commissionForTrackCost } from "@/lib/commission";
import { formatNaira } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const lead = await getLeadDetail(prisma, id);
  if (!lead) notFound();
  if (!canAccessLead(user, lead)) redirect("/leads");

  const isAdmin = user.role === "ADMIN";
  const reps = isAdmin
    ? await prisma.user.findMany({
        where: { role: "SALES_REP", active: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
        ← Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{lead.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {lead.track.name} · {lead.cohort.name}
          </p>
        </div>
        <div className="w-56">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Stage
          </label>
          <StageControl leadId={lead.id} stage={lead.stage} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Phone / WhatsApp" value={lead.phone} />
            <Row label="Email" value={lead.email} />
            <Row label="Source" value={lead.howFoundUs} />
            <Row label="Start timeline" value={lead.startTimeline} />
            <Row
              label="Assigned closer"
              value={lead.assignedRep?.name ?? "Unassigned"}
            />
            <Row
              label="Commission"
              value={
                lead.stage === "CLOSED_WON"
                  ? `${formatNaira(commissionForTrackCost(Number(lead.track.cost)))} earned`
                  : `${formatNaira(commissionForTrackCost(Number(lead.track.cost)))} on win`
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            <FollowUpChecklist leadId={lead.id} followUps={lead.followUps} />
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Assigned closer
              </label>
              <ReassignControl
                leadId={lead.id}
                assignedRepId={lead.assignedRepId}
                reps={reps.map((r) => ({ id: r.id, name: r.name }))}
              />
              <div className="mt-4 border-t border-brand-black/10 pt-4">
                <DeleteLeadButton leadId={lead.id} leadName={lead.fullName} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <NotesPanel
              leadId={lead.id}
              notes={lead.notes.map((n) => ({
                id: n.id,
                body: n.body,
                createdAt: n.createdAt,
                author: { name: n.author.name },
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {lead.activityLog.map((a) => (
                <li key={a.id} className="border-l-2 border-brand-yellow pl-3">
                  <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                  <div className="text-xs text-muted-foreground">
                    {a.user?.name ?? "System"} ·{" "}
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
              {lead.activityLog.length === 0 && (
                <li className="text-muted-foreground">No activity yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

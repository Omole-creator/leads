import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AddLeadForm } from "@/components/AddLeadForm";

export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/leads");

  const [tracks, cohorts] = await Promise.all([
    prisma.track.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  return (
    <div className="space-y-5">
      <Link href="/leads" className="text-sm text-muted-foreground hover:underline">
        ← Back to leads
      </Link>
      <h1 className="text-2xl font-bold">Add a lead</h1>
      <AddLeadForm
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        cohorts={cohorts.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}

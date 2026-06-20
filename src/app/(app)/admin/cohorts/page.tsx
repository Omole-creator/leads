import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CohortsManager } from "@/components/admin/CohortsManager";

export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const cohorts = await prisma.cohort.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Cohorts</h1>
      <CohortsManager
        cohorts={cohorts.map((c) => ({
          id: c.id,
          name: c.name,
          startDate: c.startDate.toISOString(),
          endDate: c.endDate.toISOString(),
          active: c.active,
        }))}
      />
    </div>
  );
}

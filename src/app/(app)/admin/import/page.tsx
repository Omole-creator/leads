import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ImportLeadsForm } from "@/components/ImportLeadsForm";

export const dynamic = "force-dynamic";

export default async function ImportLeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const cohorts = await prisma.cohort.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Import leads (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Bring in leads that didn&apos;t come through the application form — e.g.
          scholarship lists or other Google Forms. These stay admin-only until
          you assign them.
        </p>
      </div>
      <ImportLeadsForm cohorts={cohorts.map((c) => c.name)} />
    </div>
  );
}

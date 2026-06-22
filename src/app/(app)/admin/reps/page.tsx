import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { RepsManager } from "@/components/admin/RepsManager";

export const dynamic = "force-dynamic";

export default async function AdminRepsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  // Only list closers here — admins are not shown so they can't be deleted by
  // accident (that would lock everyone out).
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP" },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Sales Closers</h1>
      <p className="text-sm text-muted-foreground">
        Add a closer with their Google email — they can then sign in with Google
        and see only the leads assigned to them.
      </p>
      <RepsManager
        reps={reps.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: r.role,
          active: r.active,
        }))}
      />
    </div>
  );
}

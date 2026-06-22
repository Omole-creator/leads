import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TutorsManager } from "@/components/admin/TutorsManager";

export const dynamic = "force-dynamic";

export default async function AdminTutorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const tutors = await prisma.user.findMany({
    where: { role: "TUTOR" },
    orderBy: { name: "asc" },
    include: { tracksTutored: { select: { name: true } } },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tutors</h1>
        <p className="text-sm text-muted-foreground">
          Add a tutor with their Google email, then assign them track(s) on the
          Tracks page. Tutors only see attendance for their tracks.
        </p>
      </div>
      <TutorsManager
        tutors={tutors.map((t) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          active: t.active,
          tracks: t.tracksTutored.map((x) => x.name),
        }))}
      />
    </div>
  );
}

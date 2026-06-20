import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TracksManager } from "@/components/admin/TracksManager";

export const dynamic = "force-dynamic";

export default async function AdminTracksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const tracks = await prisma.track.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Tracks</h1>
      <TracksManager
        tracks={tracks.map((t) => ({
          id: t.id,
          name: t.name,
          cost: Number(t.cost),
          active: t.active,
        }))}
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { cohortOptions, tutorTracks } from "@/lib/students";

export const dynamic = "force-dynamic";

export default async function AttendanceHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TUTOR" && user.role !== "ADMIN") redirect("/dashboard");

  const { activeId } = await cohortOptions(prisma);
  const tracks = await tutorTracks(prisma, user.id, activeId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Pick a class to mark students present or absent.
        </p>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-lg border border-brand-black/10 p-6 text-center text-sm text-muted-foreground">
          You don&apos;t have any tracks assigned yet. Ask the admin to assign you
          a track.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <Link
              key={t.id}
              href={`/attendance/${t.id}`}
              className="rounded-xl border border-brand-black/10 p-5 transition-colors hover:border-brand-yellow hover:bg-brand-yellow/5"
            >
              <p className="text-lg font-semibold">{t.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.activeCount} active student{t.activeCount === 1 ? "" : "s"}
              </p>
              <p className="mt-3 text-sm font-medium text-brand-black">
                Take attendance →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

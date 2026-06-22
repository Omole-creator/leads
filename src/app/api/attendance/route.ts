import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/api";
import { attendanceSchema } from "@/lib/schemas";
import { saveAttendance } from "@/lib/students";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const parsed = attendanceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { trackId, date, marks } = parsed.data;

  // Only an admin or the track's assigned tutor may record attendance.
  const track = await prisma.track.findUnique({ where: { id: trackId } });
  if (!track) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (auth.user.role !== "ADMIN" && track.tutorId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const saved = await saveAttendance(prisma, trackId, date, marks, auth.user.id);
  return NextResponse.json({ saved });
}

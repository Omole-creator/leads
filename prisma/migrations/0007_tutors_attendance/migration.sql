-- Tutors + attendance
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TUTOR';
ALTER TABLE "Track" ADD COLUMN "tutorId" TEXT;
ALTER TABLE "Track" ADD CONSTRAINT "Track_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD COLUMN "studentStatus" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Lead" ADD COLUMN "studentTrackId" TEXT;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_studentTrackId_fkey" FOREIGN KEY ("studentTrackId") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL,
    "byId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Attendance_leadId_date_key" ON "Attendance"("leadId", "date");
CREATE INDEX "Attendance_trackId_idx" ON "Attendance"("trackId");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add segment to Lead (separates application / scholarship / imported leads)
ALTER TABLE "Lead" ADD COLUMN "segment" TEXT NOT NULL DEFAULT 'APPLICATION';

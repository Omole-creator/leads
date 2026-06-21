-- CreateTable
CREATE TABLE "FollowUpLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "byId" TEXT,
    "reached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpLog_leadId_idx" ON "FollowUpLog"("leadId");

-- AddForeignKey
ALTER TABLE "FollowUpLog" ADD CONSTRAINT "FollowUpLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpLog" ADD CONSTRAINT "FollowUpLog_byId_fkey" FOREIGN KEY ("byId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


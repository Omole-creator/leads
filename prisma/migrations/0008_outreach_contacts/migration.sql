-- Cold outreach to companies (recruitment business line) — separate from the Lead pipeline
CREATE TABLE "OutreachBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OutreachBatch_name_key" ON "OutreachBatch"("name");

CREATE TABLE "CompanyContact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "companyName" TEXT,
    "jobTitle" TEXT,
    "industry" TEXT,
    "companySize" TEXT,
    "location" TEXT,
    "hiringRoles" TEXT,
    "hiringSource" TEXT,
    "triggerEvent" TEXT,
    "personalization" TEXT,
    "batchId" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "lastEmailedAt" TIMESTAMP(3),
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyContact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyContact_email_key" ON "CompanyContact"("email");
CREATE INDEX "CompanyContact_batchId_idx" ON "CompanyContact"("batchId");
CREATE INDEX "CompanyContact_importedAt_idx" ON "CompanyContact"("importedAt");
CREATE INDEX "CompanyContact_industry_idx" ON "CompanyContact"("industry");
CREATE INDEX "CompanyContact_unsubscribed_idx" ON "CompanyContact"("unsubscribed");
ALTER TABLE "CompanyContact" ADD CONSTRAINT "CompanyContact_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OutreachBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "OutreachCampaign" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "variant" TEXT,
    "fromName" TEXT NOT NULL DEFAULT 'JobMingle Limited',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "filters" JSONB,
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutreachCampaign_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "OutreachCampaign" ADD CONSTRAINT "OutreachCampaign_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

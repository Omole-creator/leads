-- Draft vs sent status for email campaigns
ALTER TABLE "EmailCampaign" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SENT';

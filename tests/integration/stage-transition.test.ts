import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  getTestPrisma,
  resetDb,
  seedTracks,
  seedReps,
  hasTestDb,
} from "./helpers";
import { ingestLead } from "@/lib/ingest";
import { updateStage } from "@/lib/leads";

vi.mock("@/lib/email", () => ({
  sendLeadAssignedEmail: vi.fn(async () => true),
}));

const input = {
  fullName: "Test Lead",
  email: "test@example.com",
  phone: "08000000000",
  trackSelected: "Cybersecurity",
  startTimeline: "April 30th Cohort",
  howFoundUs: "instagram",
};

describe.skipIf(!hasTestDb)("stage transitions (integration)", () => {
  const prisma = getTestPrisma();

  beforeAll(async () => resetDb(prisma));
  afterAll(async () => prisma.$disconnect());
  beforeEach(async () => {
    await resetDb(prisma);
    await seedTracks(prisma);
  });

  async function makeLead() {
    const [rep] = await seedReps(prisma, 1);
    const res = await ingestLead(prisma, input);
    return { leadId: res.id, repId: rep.id };
  }

  it("updates stage and bumps lastActivityAt", async () => {
    const { leadId, repId } = await makeLead();
    const before = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateStage(
      prisma,
      { id: repId, role: "SALES_REP" },
      leadId,
      "CALLED",
    );
    expect(updated.stage).toBe("CALLED");
    expect(updated.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
      before.lastActivityAt.getTime(),
    );
  });

  it("writes an activity log entry with old + new stage", async () => {
    const { leadId, repId } = await makeLead();
    await updateStage(prisma, { id: repId, role: "SALES_REP" }, leadId, "CALLED");
    const log = await prisma.activityLog.findFirst({
      where: { leadId, action: "STAGE_CHANGED" },
    });
    expect(log).not.toBeNull();
    expect(log!.oldValue).toMatchObject({ stage: "NEW" });
    expect(log!.newValue).toMatchObject({ stage: "CALLED" });
  });

  it("sets closedAt when moving to CLOSED_WON", async () => {
    const { leadId, repId } = await makeLead();
    const updated = await updateStage(
      prisma,
      { id: repId, role: "SALES_REP" },
      leadId,
      "CLOSED_WON",
    );
    expect(updated.closedAt).not.toBeNull();
  });
});

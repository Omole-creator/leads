import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import {
  getTestPrisma,
  resetDb,
  seedTracks,
  seedReps,
  hasTestDb,
} from "./helpers";
import { ingestLead, TrackNotFoundError, parseTrackName } from "@/lib/ingest";
import { FOLLOW_UP_TYPES } from "@/lib/constants";

// Mock the Resend wrapper so we can assert it's invoked without sending email.
vi.mock("@/lib/email", () => ({
  sendLeadAssignedEmail: vi.fn(async () => true),
}));
import { sendLeadAssignedEmail } from "@/lib/email";

const baseInput = {
  fullName: "Adegbite Ezekiel oluwafemi",
  email: "phemmiechambers@gmail.com",
  phone: "08066509858",
  trackSelected: "Cybersecurity - ₦470,000",
  startTimeline: "April 30th Cohort - Last cohort with paid internships",
  howFoundUs: "instagram",
};

describe("parseTrackName", () => {
  it("strips the price suffix", () => {
    expect(parseTrackName("Cybersecurity - ₦470,000")).toBe("Cybersecurity");
  });
  it("leaves a bare name untouched", () => {
    expect(parseTrackName("Data Analysis")).toBe("Data Analysis");
  });
  it("keeps slashes in track names", () => {
    expect(parseTrackName("Cloud/DevOps Engineering")).toBe(
      "Cloud/DevOps Engineering",
    );
  });
});

describe.skipIf(!hasTestDb)("ingestLead (integration)", () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await resetDb(prisma);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDb(prisma);
    await seedTracks(prisma);
  });

  it("rejects when track name not found (404)", async () => {
    await expect(
      ingestLead(prisma, { ...baseInput, trackSelected: "Underwater Basket Weaving" }),
    ).rejects.toBeInstanceOf(TrackNotFoundError);
  });

  it("creates a lead with the seeded track price as balanceLeft", async () => {
    await seedReps(prisma, 1);
    const res = await ingestLead(prisma, baseInput);
    // Seeded Cybersecurity = 350,000 (email's 470,000 is ignored).
    expect(res.balanceLeft).toBe(350000);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: res.id } });
    expect(Number(lead.amountPaid)).toBe(0);
    expect(Number(lead.balanceLeft)).toBe(350000);
  });

  it("tags the lead to a find-or-created cohort from startTimeline", async () => {
    await seedReps(prisma, 1);
    const res1 = await ingestLead(prisma, baseInput);
    const res2 = await ingestLead(prisma, baseInput);
    // Both reuse the same cohort.
    expect(res1.cohortId).toBe(res2.cohortId);
    const cohort = await prisma.cohort.findUniqueOrThrow({
      where: { id: res1.cohortId },
    });
    expect(cohort.name).toBe(
      "April 30th Cohort - Last cohort with paid internships",
    );
  });

  it("creates 7 follow-up rows, all done=false", async () => {
    await seedReps(prisma, 1);
    const res = await ingestLead(prisma, baseInput);
    const followUps = await prisma.followUp.findMany({
      where: { leadId: res.id },
    });
    expect(followUps).toHaveLength(FOLLOW_UP_TYPES.length);
    expect(followUps.every((f) => f.done === false)).toBe(true);
  });

  it("writes a LEAD_CREATED activity log entry", async () => {
    await seedReps(prisma, 1);
    const res = await ingestLead(prisma, baseInput);
    const logs = await prisma.activityLog.findMany({ where: { leadId: res.id } });
    expect(logs.some((l) => l.action === "LEAD_CREATED")).toBe(true);
  });

  it("triggers the assigned-rep email (mocked)", async () => {
    await seedReps(prisma, 1);
    await ingestLead(prisma, baseInput);
    expect(sendLeadAssignedEmail).toHaveBeenCalledTimes(1);
  });

  it("assigns to the least-recently-assigned active rep", async () => {
    const reps = await seedReps(prisma, 3);
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const res = await ingestLead(prisma, baseInput);
      seen.add(res.assignedRepId!);
    }
    expect(seen.size).toBe(3); // 3 distinct reps for 3 leads
    expect([...seen].sort()).toEqual(reps.map((r) => r.id).sort());
  });

  it("distributes 6 leads across 3 reps as 2-2-2", async () => {
    const reps = await seedReps(prisma, 3);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 6; i++) {
      const res = await ingestLead(prisma, baseInput);
      counts[res.assignedRepId!] = (counts[res.assignedRepId!] ?? 0) + 1;
    }
    for (const r of reps) expect(counts[r.id]).toBe(2);
  });

  it("skips inactive reps in assignment", async () => {
    const reps = await seedReps(prisma, 2);
    await prisma.user.update({
      where: { id: reps[1].id },
      data: { active: false },
    });
    for (let i = 0; i < 3; i++) {
      const res = await ingestLead(prisma, baseInput);
      expect(res.assignedRepId).toBe(reps[0].id);
    }
  });

  it("when no active reps, sets assignedRepId=null and does not throw", async () => {
    const res = await ingestLead(prisma, baseInput);
    expect(res.assignedRepId).toBeNull();
    expect(sendLeadAssignedEmail).not.toHaveBeenCalled();
  });
});

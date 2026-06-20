import { PrismaClient } from "@prisma/client";
import { TRACKS } from "../../prisma/tracks.data";

export const TEST_DB_URL =
  process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || "";

export const hasTestDb = TEST_DB_URL.length > 0;

let client: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    });
  }
  return client;
}

/** Wipe all rows in a single round-trip so each test starts clean. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "ActivityLog","Note","FollowUp","Lead","Cohort","Track","User" RESTART IDENTITY CASCADE',
  );
}

export async function seedTracks(prisma: PrismaClient): Promise<void> {
  await prisma.track.createMany({
    data: TRACKS.map((t) => ({ name: t.name, cost: t.cost })),
  });
}

export async function seedReps(
  prisma: PrismaClient,
  n = 3,
): Promise<{ id: string; email: string }[]> {
  const reps = [];
  for (let i = 1; i <= n; i++) {
    const rep = await prisma.user.create({
      data: {
        name: `Rep ${i}`,
        email: `rep${i}@test.local`,
        role: "SALES_REP",
        active: true,
      },
    });
    reps.push({ id: rep.id, email: rep.email });
  }
  return reps;
}

import { PrismaClient } from "@prisma/client";
import { TRACKS } from "./tracks.data";

const prisma = new PrismaClient();

async function main() {
  // Tracks
  for (const t of TRACKS) {
    await prisma.track.upsert({
      where: { name: t.name },
      update: { cost: t.cost, active: true },
      create: { name: t.name, cost: t.cost, active: true },
    });
  }

  // A sample active cohort
  await prisma.cohort.upsert({
    where: { name: "April 30th Cohort" },
    update: {},
    create: {
      name: "April 30th Cohort",
      startDate: new Date("2026-04-30"),
      endDate: new Date("2026-07-30"),
      active: true,
    },
  });

  // Admin + sales reps
  await prisma.user.upsert({
    where: { email: "admin@jobmingle.com" },
    update: { role: "ADMIN", active: true },
    create: { name: "JobMingle Admin", email: "admin@jobmingle.com", role: "ADMIN" },
  });

  const reps = [
    { name: "Sales Rep One", email: "rep1@jobmingle.com" },
    { name: "Sales Rep Two", email: "rep2@jobmingle.com" },
    { name: "Sales Rep Three", email: "rep3@jobmingle.com" },
  ];
  for (const r of reps) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: { active: true, role: "SALES_REP" },
      create: { name: r.name, email: r.email, role: "SALES_REP" },
    });
  }

  console.log("Seed complete: tracks, cohort, admin + reps.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

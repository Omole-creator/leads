// Populates the dashboard with realistic demo leads. Safe: only touches Lead-
// related rows in this project. Run after `npm run db:seed`.
import { PrismaClient, type Stage } from "@prisma/client";
import { FOLLOW_UP_TYPES } from "../src/lib/constants";

const prisma = new PrismaClient();

const SOURCES = ["instagram", "facebook", "twitter / X", "referral", "google", "tiktok"];
const STAGES: Stage[] = [
  "NEW",
  "CALLED",
  "CLOSED_WON",
  "CLOSED_LOST",
  "NO_ANSWER",
  "SILENT",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

async function main() {
  const tracks = await prisma.track.findMany();
  const reps = await prisma.user.findMany({
    where: { role: "SALES_REP", active: true },
    orderBy: { createdAt: "asc" },
  });
  const cohort = await prisma.cohort.findFirstOrThrow({
    orderBy: { createdAt: "desc" },
  });
  if (tracks.length === 0 || reps.length === 0) {
    throw new Error("Run `npm run db:seed` first (need tracks + reps).");
  }

  // Clean slate for leads only.
  await prisma.activityLog.deleteMany();
  await prisma.note.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.lead.deleteMany();

  const NAMES = [
    "Adegbite Ezekiel", "Chioma Okeke", "Musa Ibrahim", "Tunde Bakare",
    "Ngozi Eze", "Yusuf Bello", "Funke Adeyemi", "Emeka Nwosu",
    "Aisha Suleiman", "Daniel Okon", "Blessing Ade", "Kelvin Obi",
    "Hauwa Lawal", "Segun Cole", "Rita Umeh", "Bashir Sani",
    "Peace Johnson", "Ifeanyi Kalu", "Zainab Yakubu", "Victor Eze",
    "Grace Etim", "Sodiq Lawal", "Amaka Obi", "Tobi Williams",
  ];

  let n = 0;
  for (const name of NAMES) {
    const track = pick(tracks, n);
    const cost = Number(track.cost);
    const stage = pick(STAGES, n);
    const rep = pick(reps, n);
    // Vary payments: won leads mostly paid, others partial/zero.
    const amountPaid =
      stage === "CLOSED_WON"
        ? cost
        : stage === "CALLED"
          ? Math.round(cost / 2)
          : 0;
    const createdAt = new Date(Date.now() - (n + 1) * 36 * 60 * 60 * 1000);
    const closedAt =
      stage === "CLOSED_WON" || stage === "CLOSED_LOST"
        ? new Date(createdAt.getTime() + (3 + (n % 9)) * 24 * 60 * 60 * 1000)
        : null;

    await prisma.lead.create({
      data: {
        fullName: name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        phone: `0803${String(1000000 + n * 7777).slice(0, 7)}`,
        trackId: track.id,
        amountPaid,
        balanceLeft: Math.max(0, cost - amountPaid),
        howFoundUs: pick(SOURCES, n),
        startTimeline: cohort.name,
        cohortId: cohort.id,
        assignedRepId: rep.id,
        stage,
        closedAt,
        createdAt,
        lastActivityAt: closedAt ?? createdAt,
        followUps: {
          create: FOLLOW_UP_TYPES.map((type, i) => ({
            type,
            done: i < n % 5,
          })),
        },
      },
    });
    n++;
  }

  console.log(`Demo data: created ${n} leads across ${tracks.length} tracks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

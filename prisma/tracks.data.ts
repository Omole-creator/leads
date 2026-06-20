// Owner-confirmed track list + prices. Seeded price is authoritative;
// the price embedded in a lead email is ignored. Imported by seed.ts and tests.
export const TRACKS: { name: string; cost: number }[] = [
  { name: "AI Engineering", cost: 350000 },
  { name: "Cybersecurity", cost: 350000 },
  { name: "Data Analysis", cost: 150000 },
  { name: "AI and Automation", cost: 150000 },
  { name: "Data Science", cost: 150000 },
  { name: "Cloud/DevOps Engineering", cost: 150000 },
  { name: "Content Creation", cost: 150000 },
  { name: "Product Design", cost: 150000 },
  { name: "Product Management", cost: 150000 },
  { name: "Frontend/Backend/Fullstack", cost: 150000 },
];

// Closer commission per WON deal, based on the program (track) price tier.
//   ₦150,000 programs            -> ₦10,000
//   ₦280,000 and ₦350,000 programs -> ₦20,000
// Rule: track cost >= 280,000 earns the higher tier.
export const COMMISSION_HIGH = 20000;
export const COMMISSION_LOW = 10000;
export const COMMISSION_HIGH_THRESHOLD = 280000;

/** Commission a closer earns for winning a deal on a program of this cost. */
export function commissionForTrackCost(cost: number): number {
  return cost >= COMMISSION_HIGH_THRESHOLD ? COMMISSION_HIGH : COMMISSION_LOW;
}

/** Commission actually earned on a lead: only when the deal is won. */
export function commissionEarned(stage: string, trackCost: number): number {
  return stage === "CLOSED_WON" ? commissionForTrackCost(trackCost) : 0;
}

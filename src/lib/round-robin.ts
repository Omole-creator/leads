export interface ActiveRep {
  id: string;
  lastAssignedAt: Date | null;
}

/**
 * Picks the next rep by least-recently-assigned.
 *
 * - Reps never assigned (lastAssignedAt === null) go first, in input order.
 * - Otherwise the rep whose last assignment is oldest.
 * - Returns null when there are no (active) reps.
 *
 * Callers must pass only ACTIVE reps. Least-recently-assigned (over an
 * index/counter) survives rep additions, deactivations and reactivations
 * without bookkeeping drift.
 */
export function pickNextRep(reps: ActiveRep[]): string | null {
  if (reps.length === 0) return null;

  const neverAssigned = reps.filter((r) => r.lastAssignedAt === null);
  if (neverAssigned.length > 0) {
    return neverAssigned[0].id;
  }

  const sorted = [...reps].sort(
    (a, b) => a.lastAssignedAt!.getTime() - b.lastAssignedAt!.getTime(),
  );
  return sorted[0].id;
}

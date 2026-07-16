// Scholarship email offer pricing — a discounted offer for Scholarship-segment
// leads, kept DELIBERATELY SEPARATE from the in-house price (`Track.cost`, the
// welcome email, and commission all stay untouched). `regular` is the anchor /
// "old" price shown in the email for price comparison; `scholarship` is the
// discounted price; `installment` is the per-payment amount when paid in 3.
export interface ScholarshipOffer {
  regular: number; // anchor / "old" price (for comparison in the email)
  scholarship: number; // discounted scholarship price
  installment: number; // per-installment amount, paid 3x
}

// Keyed by normalized track name (trimmed, lower-cased, internal whitespace
// collapsed). Only the tracks that differ from the default tier need an entry;
// Frontend, Backend and every other track resolve to DEFAULT_OFFER. Uses EXACT
// normalized names (not substring matching) on purpose: only the STANDALONE
// Fullstack track is the ₦210k tier. The combined "Frontend / Backend /
// Fullstack Development" and the legacy seeded "Frontend/Backend/Fullstack" are
// deliberately kept on the default ₦105k tier — they are not priced as
// fullstack. Names below mirror the real tracks in the live DB.
const OFFERS: Record<string, ScholarshipOffer> = {
  cybersecurity: { regular: 350000, scholarship: 280000, installment: 94000 },
  "ai engineering": { regular: 350000, scholarship: 280000, installment: 94000 },
  // ₦300k fullstack tier — standalone Fullstack only.
  fullstack: { regular: 300000, scholarship: 210000, installment: 70000 },
  "fullstack development": {
    regular: 300000,
    scholarship: 210000,
    installment: 70000,
  },
};

const DEFAULT_OFFER: ScholarshipOffer = {
  regular: 150000,
  scholarship: 105000,
  installment: 35000,
};

/** Scholarship offer for a track (by name). Unknown tracks → the default tier. */
export function scholarshipOffer(trackName: string): ScholarshipOffer {
  const key = trackName.trim().toLowerCase().replace(/\s+/g, " ");
  return OFFERS[key] ?? DEFAULT_OFFER;
}

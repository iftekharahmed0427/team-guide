// Client-safe dispute constants (no db imports). The bonus query lives in
// lib/disputes.ts and the screenshot/storage logic in the server action.

export const DISPUTE_OUTCOMES = ["won", "lost", "refunded"] as const;
export type DisputeOutcome = (typeof DISPUTE_OUTCOMES)[number];

// Only WON disputes count toward the recovered total and the 5% bonus.
export const BONUS_OUTCOME: DisputeOutcome = "won";

export const OUTCOME_LABEL: Record<string, string> = {
  won: "Won",
  lost: "Lost",
  refunded: "Refunded",
};

export const OUTCOME_BADGE: Record<string, string> = {
  won: "border-emerald-500/40 text-emerald-400",
  lost: "border-red-500/40 text-red-400",
  refunded: "border-amber-500/40 text-amber-400",
};

export function isDisputeOutcome(v: string): v is DisputeOutcome {
  return (DISPUTE_OUTCOMES as readonly string[]).includes(v);
}

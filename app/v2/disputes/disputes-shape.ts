// Shape and formatting for a dispute, with no database import so the client
// components can share it - the split that keeps `pg` out of the browser
// bundle, as in commissions-shape.ts.

export type Dispute = {
  id: string;
  /** Free-text reference the submitter typed. */
  dispute: string;
  category: string;
  outcome: string;
  amount: number;
  /** Null when the screenshot cannot be resolved (storage off locally). */
  src: string | null;
  submittedById: string | null;
  submittedByName: string;
  when: string;
};

export const money = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Only won disputes feed the recovered total and the bonus, which is what the
// live tool's BONUS_OUTCOME says.
export const BONUS_OUTCOME = "won";
export const BONUS_RATE = 0.05;

export const OUTCOMES = ["won", "lost", "refunded"] as const;

export const outcomeLabel = (outcome: string): string =>
  ({ won: "Won", lost: "Lost", refunded: "Refunded" })[outcome] ?? outcome;

/** The v2 tones for the three outcomes, from the audit scorecard's badge set. */
export function outcomeTone(outcome: string): string {
  if (outcome === "won") return "bg-[#10b981]/15 text-[#10b981]";
  if (outcome === "lost") return "bg-[#ef4444]/15 text-[#ef4444]";
  return "bg-[#f59e0b]/15 text-[#f59e0b]";
}

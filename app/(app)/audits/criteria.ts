// The "Gravel Host Support Ticket Review" QA rubric (from the team's scorecard
// sheet). 12 criteria, total 36 points: six worth 5 and six worth 1. A criterion
// can be marked N/A (excluded from the totals). The 5-point items use the
// scoring guide below; the 1-point items are a simple Yes (1) / No (0).

export type Criterion = {
  key: string;
  label: string;
  maxPoints: 5 | 1;
  allowNa: boolean;
  example?: string; // sample phrasing / note from the sheet
};

export const AUDIT_CRITERIA: Criterion[] = [
  {
    key: "greeting",
    label: "Greeted the customer in a professional manner",
    maxPoints: 5,
    allowNa: true,
    example: "Thank you for contacting Gravel Host. I am happy to assist you.",
  },
  {
    key: "empathy",
    label: "Displayed empathy and a willingness to help",
    maxPoints: 5,
    allowNa: true,
    example:
      "I understand how frustrating it is when you just want to play your game. Let's get this fixed for you.",
  },
  {
    key: "grammar",
    label: "Used proper grammar, spelling and punctuation",
    maxPoints: 5,
    allowNa: true,
    example: "No more than 3 spelling errors.",
  },
  {
    key: "updates",
    label: "Kept the customer updated on the progress of their ticket",
    maxPoints: 5,
    allowNa: true,
    example:
      "Tickets need to be worked every day, with a comment or question placed on them every day they are open.",
  },
  {
    key: "probing",
    label: "Asked probing questions to ensure understanding of the issue",
    maxPoints: 5,
    allowNa: true,
    example: "Was the server running and able to join before you made changes to it?",
  },
  {
    key: "solution",
    label: "Offered a solution",
    maxPoints: 5,
    allowNa: true,
    example: "I am going to transfer your server to a different node to improve performance.",
  },
  {
    key: "verification",
    label: "Requested verification that the issue was resolved for the customer",
    maxPoints: 1,
    allowNa: true,
    example: "Can you confirm this issue has been resolved for you today?",
  },
  {
    key: "additional_help",
    label: "Offered additional assistance",
    maxPoints: 1,
    allowNa: true,
    example: "Was there anything else I could do for you today?",
  },
  { key: "close_request", label: "Attached a close request", maxPoints: 1, allowNa: true },
  { key: "resolved_24h", label: "Ticket was resolved within 24 hrs", maxPoints: 1, allowNa: true },
  { key: "review_score", label: "Ticket review score", maxPoints: 1, allowNa: true },
  {
    key: "trustpilot",
    label: "Requested a Trustpilot review if applicable",
    maxPoints: 1,
    allowNa: true,
  },
];

export const CRITERIA_BY_KEY = new Map(AUDIT_CRITERIA.map((c) => [c.key, c] as const));

export const TOTAL_POSSIBLE = AUDIT_CRITERIA.reduce((sum, c) => sum + c.maxPoints, 0); // 36

// Short guide for the 5-point items (from the sheet).
export const FIVE_POINT_GUIDE =
  "0 = did not display · 1 = attempted · 3–4 = displayed, needs improvement · 5 = fully displayed";

export const FIVE_POINT_LABELS: Record<number, string> = {
  0: "Did not display the behavior",
  1: "Attempted to display the behavior",
  2: "Partially displayed",
  3: "Displayed, improvements needed",
  4: "Displayed, minor improvements",
  5: "Displayed the requested behavior",
};

export type ScoreEntry = { key: string; na: boolean; score: number };

// Total earned + total possible, excluding N/A criteria. Shared by the form
// (live preview) and the server action (authoritative compute).
export function computeTotals(scores: ScoreEntry[]): { total: number; possible: number } {
  let total = 0;
  let possible = 0;
  for (const s of scores) {
    const c = CRITERIA_BY_KEY.get(s.key);
    if (!c || s.na) continue;
    possible += c.maxPoints;
    total += Math.max(0, Math.min(c.maxPoints, s.score));
  }
  return { total, possible };
}

export function percentage(total: number, possible: number): number {
  return possible > 0 ? Math.round((total / possible) * 100) : 0;
}

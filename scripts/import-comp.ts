// One-time import of the legacy "Team Compensation" spreadsheet (periods 5-12)
// into comp_period / comp_entry. Idempotent: skips any period number that already
// exists. Run: bun --env-file=.env.local run scripts/import-comp.ts
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "../db";
import { compPeriod, compEntry } from "../db/app-schema";

// CSV display name -> existing app user id (null = import as history-only row).
const UID: Record<string, string | null> = {
  Oreo: "BZyKB6Lxrt4ozPu8N71TnUTvoIp3pkA9", // OrewSegs
  Vampy: "0nAArFKQxajCOotsrlGUvKT7XRryLwJm", // Siren Vampy
  Tash: null,
  Tarna: null,
  Petrino: "WC7aE97ZQkmsLPLdb81Krp8GPOGJpRMq",
  iiYoyo: "YaZP4HU480bJrTtVXpij2afbSJ61RQll",
  Trinity: "QEe7REjAYX9kEGqvFrw4S1NlmCPPGSCu",
  Paradox: null,
  Nanashi: null,
  FXMoon: "V4Z6E8iyBcMwbCdZQirKwxfI19BX0Ckz",
  Angeline: "WxlTvWQ4FA5fOWY4qBjhuCb4kAwxOvjw",
};

type E = {
  name: string;
  role: string;
  tickets: number;
  base: number;
  bonusIncluded: boolean;
  bonusAmount: number;
  commission: number;
  recovered: number;
  paypal: string;
};

// Ticket member (role "Tickets"): $1/ticket, flat $50 bonus when included.
const t = (name: string, tickets: number, bonus: boolean, commission = 0, paypal = ""): E => ({
  name, role: "Tickets", tickets, base: 0,
  bonusIncluded: bonus, bonusAmount: bonus ? 50 : 0, commission, recovered: 0, paypal,
});
// Role member: fixed base compensation (+ optional commission / recovered basis).
const r = (name: string, role: string, base: number, commission = 0, recovered = 0): E => ({
  name, role, tickets: 0, base, bonusIncluded: false, bonusAmount: 0, commission, recovered, paypal: "",
});

const PERIODS: {
  number: number;
  label: string;
  reviewBonusLabel: string;
  reviewCount: number;
  entries: E[];
}[] = [
  {
    number: 5, label: "Feb 27-Mar 12", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 0,
    entries: [
      t("Oreo", 1, false), t("Vampy", 232, true), t("Tash", 415, true),
      t("Tarna", 16, true), t("Petrino", 100, true), t("iiYoyo", 90, true),
      r("Paradox", "Discord Manager", 200), r("Nanashi", "Backend & Node Management", 300),
      r("FXMoon", "Disputes", 200),
    ],
  },
  {
    number: 6, label: "Mar 13-26", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 56,
    entries: [
      t("Oreo", 0, false), t("Vampy", 175, true), t("Tash", 459, true),
      t("Tarna", 13, true), t("Petrino", 157, true), t("iiYoyo", 75, true),
      r("FXMoon", "Disputes", 200), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 300),
    ],
  },
  {
    number: 7, label: "Mar 27-Apr 9", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 62,
    entries: [
      t("Oreo", 7, true), t("Vampy", 202, true), t("Tash", 505, true),
      t("Tarna", 0, false), t("Petrino", 105, true), t("iiYoyo", 184, true),
      r("FXMoon", "Disputes", 200, 6.85, 137.08), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 300),
    ],
  },
  {
    number: 8, label: "Apr 10-Apr 23", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 51,
    entries: [
      t("Oreo", 0, false), t("Vampy", 208, true, 5.28), t("Tash", 514, true),
      t("Tarna", 0, false), t("Petrino", 82, true), t("iiYoyo", 55, true),
      r("FXMoon", "Disputes", 200, 5.44, 108.74), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 300), r("Angeline", "COO", 1000),
    ],
  },
  {
    number: 9, label: "Apr 24 - May 7", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 52,
    entries: [
      t("Oreo", 10, false), t("Vampy", 204, true), t("Tash", 394, true),
      t("Tarna", 0, false), t("Petrino", 58, true), t("iiYoyo", 99, true),
      r("FXMoon", "Disputes", 200, 14.83, 296.52), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 400),
    ],
  },
  {
    number: 10, label: "May 8 - 21", reviewBonusLabel: "Reviews Bonus", reviewCount: 65,
    entries: [
      t("Oreo", 2, false), t("Vampy", 302, true, 7.73, "vampshadow89@gmail.com"),
      t("Tash", 342, true, 0.43), t("Tarna", 0, false), t("Petrino", 34, true),
      t("iiYoyo", 36, true, 4.29), t("Trinity", 131, true, 1.38, "Cjay042@gmail.com"),
      r("FXMoon", "Disputes", 200, 0.98, 19.59), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 400),
    ],
  },
  {
    number: 11, label: "May 22 - June 04", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 50,
    entries: [
      t("Oreo", 1, false), t("Vampy", 301, true, 0, "vampshadow89@gmail.com"),
      t("Tash", 366, true), t("Tarna", 0, false), t("Petrino", 49, false),
      t("iiYoyo", 123, true, 0.40), t("Trinity", 65, true, 0, "Cjay042@gmail.com"),
      r("FXMoon", "Disputes", 200, 3.10, 61.92), r("Paradox", "Discord Manager", 200),
      r("Nanashi", "Backend & Node Management", 400, -100),
    ],
  },
  {
    number: 12, label: "June 05 - 18", reviewBonusLabel: "Trust Pilot Bonus", reviewCount: 53,
    entries: [
      t("Oreo", 3, false), t("Vampy", 317, true, 5.52, "vampshadow89@gmail.com"),
      t("Tash", 455, true), t("Tarna", 0, false), t("Petrino", 77, true, 1.21),
      t("iiYoyo", 171, true, 2.70), t("Trinity", 120, true, 0, "Cjay042@gmail.com"),
      r("FXMoon", "Disputes", 200, 6.20, 124.0),
      r("Nanashi", "Backend & Node Management", 400, -100),
    ],
  },
];

const numbers = PERIODS.map((p) => p.number);
const existing = await db
  .select({ number: compPeriod.number })
  .from(compPeriod)
  .where(inArray(compPeriod.number, numbers));
const skip = new Set(existing.map((e) => e.number));

let createdPeriods = 0;
let createdEntries = 0;

for (const p of PERIODS) {
  if (skip.has(p.number)) {
    console.log(`skip period ${p.number} (already imported)`);
    continue;
  }
  const periodId = randomUUID();
  await db.insert(compPeriod).values({
    id: periodId,
    number: p.number,
    label: p.label,
    reviewBonusLabel: p.reviewBonusLabel,
    reviewBonusEnabled: true,
    reviewBonusAmount: 50,
    reviewCount: p.reviewCount,
    finalized: true,
  });
  createdPeriods++;

  let pos = 0;
  const rows = p.entries.map((e) => ({
    id: randomUUID(),
    periodId,
    memberId: UID[e.name] ?? null,
    memberName: e.name,
    role: e.role,
    tickets: e.tickets,
    ticketRate: 1,
    baseCompensation: e.base,
    bonusIncluded: e.bonusIncluded,
    bonusAmount: e.bonusAmount,
    commission: e.commission,
    recoveredRevenue: e.recovered,
    reimbursement: 0,
    paypalEmail: e.paypal,
    note: "",
    position: pos++,
  }));
  await db.insert(compEntry).values(rows);
  createdEntries += rows.length;
  console.log(`imported period ${p.number} (${p.label}) - ${rows.length} rows`);
}

console.log(`\nDone. ${createdPeriods} periods, ${createdEntries} entries.`);
process.exit(0);

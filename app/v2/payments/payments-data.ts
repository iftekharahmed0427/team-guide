// Shared shape and placeholder content for /v2/payments, used by the server
// page (header, stat cards, hidden section) and by the client table island that
// owns the read/edit states. Still redesign-canvas data - nothing here reads
// from the payment tables.

// Tickets pay a flat rate; roles that are not on tickets earn their base only.
export const PER_TICKET = 1;

export const PERIOD = { label: "Jul 31 – Aug 14", note: "14 days in" };

/** The five columns the edit state turns into inputs. */
export const EDITABLE = ["base", "tickets", "bonus", "commissions", "adjustment"] as const;

export type EditableKey = (typeof EDITABLE)[number];

export type Row = {
  name: string;
  initials: string;
  /** Avatar fill - the frame gives each member their own muted hue. */
  tint: string;
  role: string;
} & Record<EditableKey, number>;

export const ROWS: Row[] = [
  {
    name: "OrewSegs",
    initials: "OS",
    tint: "#a78fb0",
    role: "Tickets",
    base: 0,
    tickets: 386,
    bonus: 50,
    commissions: 0,
    adjustment: 2.5,
  },
  {
    name: "Siren Vampy",
    initials: "SV",
    tint: "#8fa7b0",
    role: "Tickets",
    base: 0,
    tickets: 336,
    bonus: 50,
    commissions: 3.92,
    adjustment: 0,
  },
  {
    name: "iiYoyo",
    initials: "IY",
    tint: "#8fb0a7",
    role: "Tickets",
    base: 0,
    tickets: 121,
    bonus: 50,
    commissions: 0,
    adjustment: 0,
  },
  {
    name: "Trinity™",
    initials: "T",
    tint: "#b08f8f",
    role: "Tickets",
    base: 0,
    tickets: 90,
    bonus: 50,
    commissions: 0,
    adjustment: 1,
  },
  {
    name: "Farah",
    initials: "FA",
    tint: "#b0a78f",
    role: "Tickets",
    base: 0,
    tickets: 42,
    bonus: 0,
    commissions: 1.22,
    adjustment: 0,
  },
  {
    name: "Petrino",
    initials: "PE",
    tint: "#98b08f",
    role: "Tickets",
    base: 0,
    tickets: 25,
    bonus: 0,
    commissions: 0,
    adjustment: 0,
  },
  {
    name: "Conscience",
    initials: "CO",
    tint: "#8fb09e",
    role: "Backend",
    base: 400,
    tickets: 0,
    bonus: 0,
    commissions: 0,
    adjustment: -100,
  },
  {
    name: "FxMoon",
    initials: "FM",
    tint: "#afa7af",
    role: "Disputes",
    base: 200,
    tickets: 0,
    bonus: 0,
    commissions: 0,
    adjustment: 0,
  },
];

export const HIDDEN = [
  { name: "Angeline", initials: "A", tint: "#8fb0a7", role: "Administrator" },
];

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Adjustments carry their sign; a zero stays unsigned. */
export const signed = (n: number) => (n > 0 ? `+${money(n)}` : money(n));

export const amountOf = (r: Record<EditableKey, number>) =>
  r.base + r.tickets * PER_TICKET + r.bonus + r.commissions + r.adjustment;

export const sum = (rows: Row[], pick: (r: Row) => number) =>
  rows.reduce((total, r) => total + pick(r), 0);

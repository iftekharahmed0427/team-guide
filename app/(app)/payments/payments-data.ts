import {
  TICKET_RATE,
  effectiveCommission,
  effectiveTickets,
  memberTotal,
  type PayableMember,
} from "@/lib/payment-constants";
import { plainName } from "../member";

// The shape the v2 payroll table renders, derived from the live PayableMember so
// both sheets agree on what a member is owed. The arithmetic itself is the live
// memberTotal: this file only picks the columns the frame draws.

export const PER_TICKET = TICKET_RATE;

export type Row = {
  /** userId where the channel is linked, else the channel id. */
  key: string;
  userId: string | null;
  name: string;
  /** Read live from the user table; Avatar derives the fallback hue. */
  image: string | null;
  role: string;
  roleId: string | null;
  paidPerTicket: boolean;
  base: number;
  tickets: number;
  /** The admin's fixed count, when they set one. */
  override: number | null;
  /** Manual bonus plus the automatic dispute and review bonuses. */
  bonus: number;
  manualBonus: number;
  commissions: number;
  commissionOverride: number | null;
  adjustment: number;
  amount: number;
};

export function toRow(m: PayableMember): Row {
  const name = plainName(m.name);
  return {
    key: m.userId ?? m.channelId,
    userId: m.userId,
    name,
    image: m.image ?? null,
    role: m.roleName ?? "Unassigned",
    roleId: m.roleId,
    paidPerTicket: m.paidPerTicket,
    base: m.baseCompensation,
    tickets: effectiveTickets(m),
    override: m.override,
    // The frame draws one Bonus column; the sheet pays three kinds, so they are
    // added up here and the breakdown stays on the live page.
    bonus: m.bonus + m.disputeBonus + m.reviewBonus,
    manualBonus: m.bonus,
    commissions: effectiveCommission(m),
    commissionOverride: m.commissionOverride,
    adjustment: m.adjustment,
    amount: memberTotal({ ...m, commission: effectiveCommission(m) }),
  };
}

export const money = (n: number): string =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const sum = <T,>(rows: T[], pick: (row: T) => number): number =>
  rows.reduce((total, row) => total + pick(row), 0);

import Avatar from "../avatar";
import { money } from "./payments-data";

// The payroll table, drawn once and used twice: the live sheet on /payments
// (payments-page frame, node 56:61) and every archived card on
// /payments/history (payment-history-page frame, node 136:163). Both frames
// draw the same eight columns at the same widths, so they share this.
//
// Purely presentational: the caller works out each amount, since the live sheet
// and an archived period compute them differently (a flat rate per ticket
// against a per-period rate plus an admin override).

export type PayrollRow = {
  key: string;
  name: string;
  image: string | null;
  role: string;
  base: number;
  tickets: number;
  bonus: number;
  commissions: number;
  adjustment: number;
  amount: number;
};

// Column widths are the frames'. Both leave slack past the last column at the
// 1440 canvas; here Member absorbs it, so the money columns stay flush with the
// table's right padding at any window width.
const COL = {
  member: "min-w-[220px] flex-1",
  role: "w-[110px]",
  base: "w-[110px] text-right",
  tickets: "w-[90px] text-right",
  bonus: "w-[100px] text-right",
  commissions: "w-[120px] text-right",
  adjustment: "w-[120px] text-right",
  amount: "w-[110px] text-right",
};

const tone = (n: number) =>
  n > 0 ? "text-[#10b981]" : n < 0 ? "text-[#ef4444]" : "text-[#94a3b8]";

/** Adjustments carry their sign; a zero stays unsigned. */
const signed = (n: number) => (n > 0 ? `+${money(n)}` : money(n));

const sum = (rows: PayrollRow[], pick: (r: PayrollRow) => number) =>
  rows.reduce((total, r) => total + pick(r), 0);

export default function PayrollTable({ rows }: { rows: PayrollRow[] }) {
  const totalTickets = sum(rows, (r) => r.tickets);
  const totalAdjustment = sum(rows, (r) => r.adjustment);

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col">
      <div className="flex items-start rounded-[6px] bg-[#0e1217] px-[16px] py-[12px] text-[11px] font-bold text-[#94a3b8] uppercase">
        <p className={COL.member}>Member</p>
        <p className={COL.role}>Role</p>
        <p className={COL.base}>Base Comp</p>
        <p className={COL.tickets}>Tickets</p>
        <p className={COL.bonus}>Bonus</p>
        <p className={COL.commissions}>Commissions</p>
        <p className={COL.adjustment}>Adjustment</p>
        <p className={COL.amount}>Amount</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-[16px] py-[16px] text-[13px] font-normal text-[#64748b]">
          No member rows in this period.
        </p>
      ) : null}

      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center border-b border-[#243033]! px-[16px] py-[14px]"
        >
          <div className={`flex items-center gap-[12px] ${COL.member}`}>
            <Avatar
              name={row.name}
              image={row.image}
              size={28}
              textClassName="text-[11px]"
            />
            <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">{row.name}</p>
          </div>
          <p className={`truncate text-[13px] font-normal text-[#94a3b8] ${COL.role}`}>
            {row.role}
          </p>
          <p className={`text-[13px] font-normal text-[#e2e8f0] ${COL.base}`}>{money(row.base)}</p>
          <p className={`text-[13px] font-semibold text-white ${COL.tickets}`}>{row.tickets}</p>
          <p className={`text-[13px] font-normal text-[#e2e8f0] ${COL.bonus}`}>{money(row.bonus)}</p>
          <p className={`text-[13px] font-normal text-[#e2e8f0] ${COL.commissions}`}>
            {money(row.commissions)}
          </p>
          <p className={`text-[13px] font-semibold ${tone(row.adjustment)} ${COL.adjustment}`}>
            {signed(row.adjustment)}
          </p>
          <p className={`text-[14px] font-bold text-[#8fb0a7] ${COL.amount}`}>{money(row.amount)}</p>
        </div>
      ))}

      <div className="flex items-center bg-white/[0.01] p-[16px] text-[13px] font-bold text-white">
        <p className={`text-[#94a3b8] ${COL.member}`}>Total</p>
        <p className={COL.role} />
        <p className={COL.base}>{money(sum(rows, (r) => r.base))}</p>
        <p className={COL.tickets}>{totalTickets.toLocaleString("en-US")}</p>
        <p className={COL.bonus}>{money(sum(rows, (r) => r.bonus))}</p>
        <p className={COL.commissions}>{money(sum(rows, (r) => r.commissions))}</p>
        <p className={`${tone(totalAdjustment)} ${COL.adjustment}`}>{signed(totalAdjustment)}</p>
        <p className={`text-[15px] font-extrabold text-[#8fb0a7] ${COL.amount}`}>
          {money(sum(rows, (r) => r.amount))}
        </p>
      </div>
    </div>
  );
}

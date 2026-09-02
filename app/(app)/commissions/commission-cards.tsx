import CommissionRowCard from "./[member]/commission-row";
import {
  fmtRenewal,
  statusLabel,
  statusTone,
  type CommissionRow,
} from "./commissions-shape";

// The grid of commission cards, shared by a member's own view on /commissions
// and the admin's view of one submitter at /commissions/[member], so the two
// cannot drift apart.
//
// Three up. Rows stretch so a card carrying a review note does not stand taller
// than the two beside it, and a card expands to the full row while it is being
// reviewed so the pricing controls keep their width.

export default function CommissionCards({
  rows,
  isAdmin,
  empty,
}: {
  rows: CommissionRow[];
  isAdmin: boolean;
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-[12px] border border-[#243033]! bg-[#171e24] p-[40px] text-center text-[13px] text-[#64748b]">
        {empty}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[16px]">
      {rows.map((row) => (
        <CommissionRowCard
          key={row.id}
          isAdmin={isAdmin}
          row={{ ...row, renewalLabel: fmtRenewal(row.renewal) }}
          statusClass={statusTone(row.status)}
          statusText={statusLabel(row.status)}
        />
      ))}
    </div>
  );
}

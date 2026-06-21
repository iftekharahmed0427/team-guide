import { CalendarRange, Ticket, Crown } from "lucide-react";
import Avatar from "@/app/components/avatar";
import { getSession } from "@/lib/auth";
import { getPayableMembers, getCurrentPeriod, getPaymentRoles } from "@/lib/payments";
import { formatDateShort } from "@/lib/datetime";
import { formatUSD, TICKET_RATE, ticketPayout, effectiveTickets } from "./constants";
import TicketCell from "./ticket-cell";
import RoleCell from "./role-cell";

const DAY_MS = 1000 * 60 * 60 * 24;

export default async function PaymentsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";

  const [members, period, roles] = await Promise.all([
    getPayableMembers(),
    getCurrentPeriod(),
    getPaymentRoles(),
  ]);
  // Admins see everyone; a member sees only their own row.
  const rows = isAdmin
    ? members
    : members.filter((m) => m.userId && m.userId === currentUserId);

  const totalTickets = rows.reduce((s, m) => s + effectiveTickets(m), 0);
  const totalPayout = ticketPayout(totalTickets);
  const top = rows[0] && effectiveTickets(rows[0]) > 0 ? rows[0] : null;

  const elapsedDays = period.start
    ? Math.max(1, Math.round((Date.now() - period.start.getTime()) / DAY_MS))
    : 0;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Payments</h1>
          <p className="text-xs text-muted">
            {formatUSD(TICKET_RATE)} per ticket (live from Reports)
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise flex w-full flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card
              icon={CalendarRange}
              label="Current period"
              value={
                period.start && period.end
                  ? `${formatDateShort(period.start)} - ${formatDateShort(period.end)}`
                  : "No reset yet"
              }
              sub={
                period.start
                  ? `${elapsedDays} ${elapsedDays === 1 ? "day" : "days"} in`
                  : "Ongoing"
              }
            />
            <Card
              icon={Ticket}
              label="Total tickets"
              value={String(totalTickets)}
              sub={`${formatUSD(totalPayout)} owed`}
            />
            <Card
              icon={Crown}
              label="Top member"
              value={top ? top.name : "None"}
              sub={
                top
                  ? `${effectiveTickets(top)} tickets · ${formatUSD(ticketPayout(effectiveTickets(top)))}`
                  : "No tickets yet"
              }
            />
          </div>

          <div className="w-full border border-border bg-surface">
            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted">
                No ticket activity yet. Members appear here once they handle tickets in Reports.
              </p>
            ) : (
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted">
                      Member
                    </th>
                    <th className="h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted">
                      Role
                    </th>
                    <th className="h-11 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted">
                      Tickets
                    </th>
                    <th className="h-11 px-4 text-right align-middle text-xs font-medium uppercase tracking-wide text-muted">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr
                      key={m.userId ?? m.channelId}
                      className="border-b border-border transition-colors hover:bg-surface-2"
                    >
                      <td className="h-12 px-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} image={m.image} size={26} />
                          <span className="font-medium">{m.name}</span>
                        </div>
                      </td>
                      <td className="h-12 px-4 align-middle">
                        {isAdmin && m.userId ? (
                          <RoleCell
                            key={m.roleId ?? "none"}
                            userId={m.userId}
                            roleId={m.roleId}
                            roles={roles}
                          />
                        ) : (
                          <span className={m.roleName ? "text-foreground" : "text-muted"}>
                            {m.roleName ?? "Unassigned"}
                          </span>
                        )}
                      </td>
                      <td className="h-12 px-4 text-right align-middle tabular-nums">
                        {isAdmin && m.userId ? (
                          <TicketCell userId={m.userId} live={m.tickets} override={m.override} />
                        ) : (
                          effectiveTickets(m)
                        )}
                      </td>
                      <td className="h-12 px-4 text-right align-middle font-medium tabular-nums">
                        {formatUSD(ticketPayout(effectiveTickets(m)))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="h-12 px-4 align-middle">Total</td>
                    <td className="h-12 px-4 align-middle" />
                    <td className="h-12 px-4 text-right align-middle tabular-nums">{totalTickets}</td>
                    <td className="h-12 px-4 text-right align-middle tabular-nums">
                      {formatUSD(totalPayout)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-border bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Icon size={13} strokeWidth={1.75} />
        {label}
      </div>
      <p className="mt-1 truncate text-2xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 truncate text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

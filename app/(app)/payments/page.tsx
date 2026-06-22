import { CalendarRange, Ticket, Crown, Construction } from "lucide-react";
import { getSession } from "@/lib/auth";
import { getPayableMembers, getCurrentPeriod, getPaymentRoles } from "@/lib/payments";
import { formatDateShort } from "@/lib/datetime";
import { formatUSD, TICKET_RATE, ticketPayout, effectiveTickets } from "./constants";
import PaymentsTable from "./payments-table";

const DAY_MS = 1000 * 60 * 60 * 24;

// Temporary: while the payments tool is still being built, it is locked to
// Conscience (iftekharahmed0427@gmail.com) plus the local dev user. Everyone else
// - members and other admins - sees a "Work in progress" screen. Remove this gate
// to open it up.
const PAYMENTS_OWNER_IDS = ["O4lT5kzRhdEXYDQUFb3EmKPKWtd5qtBw", "dev-user"];

export default async function PaymentsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";

  if (!PAYMENTS_OWNER_IDS.includes(currentUserId)) {
    return <WorkInProgress />;
  }

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
  // Ticket money is only earned by paid-per-ticket roles.
  const ticketPay = rows.reduce(
    (s, m) => s + (m.paidPerTicket ? ticketPayout(effectiveTickets(m)) : 0),
    0,
  );
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
              sub={`${formatUSD(ticketPay)} from tickets`}
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

          <PaymentsTable members={rows} roles={roles} editable={isAdmin} />
        </div>
      </main>
    </>
  );
}

function WorkInProgress() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Payments</h1>
          <p className="text-xs text-muted">Work in progress</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center border border-border bg-surface">
            <Construction size={26} strokeWidth={1.5} className="text-muted" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Work in progress</h2>
            <p className="mt-1 text-sm text-muted">
              The payments tool is still being built. It will be available here soon.
            </p>
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

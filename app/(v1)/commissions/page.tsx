import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { commission } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import CommissionForm from "./commission-form";
import CommissionDirectory, { type MemberData } from "./commission-directory";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Renewal is a plain calendar date (no time); format it literally, no tz shift.
function formatRenewal(d: string | null) {
  if (!d) return null;
  const x = new Date(`${d}T00:00:00Z`);
  return `${SHORT_MONTHS[x.getUTCMonth()]} ${x.getUTCDate()}, ${x.getUTCFullYear()}`;
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const BADGE: Record<string, string> = {
  approved: "border-emerald-500/40 text-emerald-400",
  denied: "border-red-500/40 text-red-400",
  pending: "border-border text-muted",
};

function StatusBadge({ status }: { status: string }) {
  const label = status === "approved" ? "Approved" : status === "denied" ? "Denied" : "Pending";
  return (
    <span
      className={`shrink-0 border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${BADGE[status] ?? BADGE.pending}`}
    >
      {label}
    </span>
  );
}

export default async function CommissionsPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";

  // Newest first (by full timestamp). Admins see everyone; members see only theirs.
  const rows = await db
    .select({
      id: commission.id,
      ticketName: commission.ticketName,
      customerEmail: commission.customerEmail,
      status: commission.status,
      renewalDate: commission.renewalDate,
      productPrice: commission.productPrice,
      commissionRate: commission.commissionRate,
      reviewNote: commission.reviewNote,
      submittedById: commission.submittedById,
      submittedByName: commission.submittedByName,
      submitterImage: user.image,
      createdAt: commission.createdAt,
    })
    .from(commission)
    .leftJoin(user, eq(commission.submittedById, user.id))
    .where(isAdmin ? undefined : eq(commission.submittedById, currentUserId))
    .orderBy(desc(commission.createdAt));

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  // ── Admin: one card per member, drilling into that member's commissions ──────
  if (isAdmin) {
    const byMember = new Map<string, MemberData>();
    for (const r of rows) {
      const key = r.submittedById ?? "unknown";
      let m = byMember.get(key);
      if (!m) {
        m = {
          id: key,
          name: r.submittedByName || "Member",
          image: r.submitterImage ?? null,
          approved: 0,
          pending: 0,
          denied: 0,
          earnings: 0,
          commissions: [],
        };
        byMember.set(key, m);
      }
      const payout =
        r.productPrice != null ? (r.productPrice * (r.commissionRate ?? 0)) / 100 : 0;
      if (r.status === "approved") {
        m.approved++;
        m.earnings += payout;
      } else if (r.status === "denied") {
        m.denied++;
      } else {
        m.pending++;
      }
      m.commissions.push({
        id: r.id,
        ticketName: r.ticketName,
        customerEmail: r.customerEmail,
        status: r.status,
        renewalDate: r.renewalDate,
        productPrice: r.productPrice,
        commissionRate: r.commissionRate,
        reviewNote: r.reviewNote,
        createdAtLabel: formatDateTime(r.createdAt),
      });
    }
    // Members with work awaiting review first, then alphabetical.
    const members = [...byMember.values()].sort(
      (a, b) => b.pending - a.pending || a.name.localeCompare(b.name),
    );

    return (
      <>
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
          <div>
            <h1 className="text-base font-semibold tracking-tight">Commissions</h1>
            <p className="text-xs text-muted">
              {members.length} member{members.length === 1 ? "" : "s"} · {rows.length} total ·{" "}
              {pendingCount} awaiting review
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
            <CommissionForm />
            <CommissionDirectory members={members} />
          </div>
        </main>
      </>
    );
  }

  // ── Member: their own commissions, read-only, newest first ───────────────────
  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Commissions</h1>
          <p className="text-xs text-muted">Submit a commission and track its status</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
          <CommissionForm />

          <h2 className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
            Your commissions
          </h2>

          {rows.length === 0 ? (
            <div className="border border-border bg-surface p-10 text-center text-sm text-muted">
              No commissions yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((c) => {
                const payout =
                  c.productPrice != null ? (c.productPrice * (c.commissionRate ?? 0)) / 100 : null;
                const renewal = formatRenewal(c.renewalDate);
                return (
                  <div key={c.id} className="border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.ticketName}
                        </p>
                        <p className="truncate text-xs text-muted">{c.customerEmail}</p>
                        <p className="mt-2 text-xs text-muted">{formatDateTime(c.createdAt)}</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    {c.status === "approved" && payout != null ? (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="text-xs text-muted">Your commission</p>
                        <p className="text-2xl font-semibold tabular-nums text-foreground">
                          {formatUSD(payout)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {c.commissionRate}% of {formatUSD(c.productPrice ?? 0)}
                          {renewal ? ` · renews ${renewal}` : ""}
                        </p>
                        {c.reviewNote ? (
                          <p className="mt-2 text-xs leading-5 text-muted">
                            <span className="text-foreground">Note:</span> {c.reviewNote}
                          </p>
                        ) : null}
                      </div>
                    ) : c.status === "denied" ? (
                      <div className="mt-2">
                        <p className="text-sm text-muted">This commission was not approved.</p>
                        {c.reviewNote ? (
                          <p className="mt-1 text-xs leading-5 text-muted">
                            <span className="text-foreground">Reason:</span> {c.reviewNote}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Awaiting admin review.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

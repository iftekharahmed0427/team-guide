import { desc, eq, sql } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { commission } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import Avatar from "@/app/components/avatar";
import CommissionForm from "./commission-form";
import CommissionReview from "./commission-review";
import { deleteCommission } from "./actions";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatWhen(d: Date | string) {
  const x = new Date(d);
  return `${SHORT_MONTHS[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`;
}

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
    // Pending first so admins see what needs review at the top.
    .orderBy(sql`case when ${commission.status} = 'pending' then 0 else 1 end`, desc(commission.createdAt));

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Commissions</h1>
          <p className="text-xs text-muted">
            {isAdmin
              ? `${rows.length} total · ${pendingCount} awaiting review`
              : "Submit a commission and track its status"}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
          <CommissionForm />

          <h2 className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
            {isAdmin ? "All commissions" : "Your commissions"}
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

                if (isAdmin) {
                  return (
                    <div key={c.id} className="border border-border bg-surface">
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {c.ticketName}
                          </p>
                          <p className="truncate text-xs text-muted">{c.customerEmail}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Avatar name={c.submittedByName} image={c.submitterImage} size={20} />
                            <span className="text-xs text-muted">
                              {c.submittedByName || "Member"} · {formatWhen(c.createdAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={c.status} />
                          <form action={deleteCommission} className="flex">
                            <input type="hidden" name="id" value={c.id} />
                            <button
                              type="submit"
                              aria-label="Delete commission"
                              className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                            >
                              <Trash2 size={14} strokeWidth={1.75} />
                            </button>
                          </form>
                        </div>
                      </div>
                      <CommissionReview
                        c={{
                          id: c.id,
                          status: c.status,
                          renewalDate: c.renewalDate,
                          productPrice: c.productPrice,
                          commissionRate: c.commissionRate,
                          reviewNote: c.reviewNote,
                        }}
                      />
                    </div>
                  );
                }

                // Member view: read-only status + payout once approved.
                const renewal = formatRenewal(c.renewalDate);
                return (
                  <div key={c.id} className="border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {c.ticketName}
                        </p>
                        <p className="truncate text-xs text-muted">{c.customerEmail}</p>
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

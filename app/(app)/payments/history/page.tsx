import { redirect } from "next/navigation";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { getPaymentHistory } from "@/lib/payment-history";
import { getPaymentRoles } from "@/lib/payments";
import { PAYMENTS_OWNER_IDS } from "../constants";
import HistoryManager from "./history-manager";

export default async function PaymentHistoryPage() {
  const session = await getSession();
  const currentUserId = session?.user.id ?? "";
  const isAdmin = session?.user.role === "admin";
  // Same gate as the payments tool itself (owner-locked while WIP).
  if (!isAdmin || !PAYMENTS_OWNER_IDS.includes(currentUserId)) redirect("/payments");

  const [periods, roles, members] = await Promise.all([
    getPaymentHistory(),
    getPaymentRoles(),
    db.select({ name: userTable.name }).from(userTable).orderBy(asc(userTable.name)),
  ]);

  const memberNames = members.map((m) => m.name).filter((n): n is string => !!n);
  const roleOptions = roles.map((r) => ({ name: r.name, paidPerTicket: r.paidPerTicket }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Payment history</h1>
          <p className="text-xs text-muted">
            Past pay periods, snapshotted on Reset all or entered by hand
          </p>
        </div>
        <Link
          href="/payments"
          className="btn-wipe inline-flex h-9 shrink-0 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back to payments
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-5xl">
          <HistoryManager periods={periods} memberNames={memberNames} roles={roleOptions} />
        </div>
      </main>
    </>
  );
}

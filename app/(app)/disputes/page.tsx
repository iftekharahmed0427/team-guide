import Link from "next/link";
import { desc } from "drizzle-orm";
import { Gavel, Coins, HandCoins, History, Lock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportPeriod } from "@/db/app-schema";
import { signedGetUrl } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/datetime";
import {
  canAccessDisputes,
  getCurrentDisputes,
  getDisputeCategories,
  DISPUTE_BONUS_RATE,
} from "@/lib/disputes";
import { formatUSD } from "@/app/(app)/payments/constants";
import DisputesClient, { type DisputeItem } from "./disputes-client";

// A stored key needs a short-lived presigned URL; a legacy inline data URL is
// already renderable as-is.
async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

// Payment disputes logged by the Disputes role (and admins). Each carries a
// customer email, category, disputed amount, and screenshot; 5% of the period's
// amounts feeds each submitter's /payments bonus. Disputes reset into history
// when an admin runs "Reset all" (they share the report period). Live via the
// app_event realtime bus.
export default async function DisputesPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id ?? "";

  if (!(await canAccessDisputes(session))) {
    return <NoAccess />;
  }

  const [rows, categories, lastArchiveRow] = await Promise.all([
    getCurrentDisputes(),
    getDisputeCategories(),
    db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1),
  ]);

  const lastArchive = lastArchiveRow[0];
  const periodLabel = lastArchive?.endedAt
    ? `Current period: since ${formatDate(lastArchive.endedAt)}`
    : "Current period: ongoing (no reset yet)";

  const items: DisputeItem[] = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      email: r.email,
      category: r.category,
      amount: r.amount,
      src: await displayUrl(r.imageUrl),
      submittedById: r.submittedById,
      submittedByName: r.submittedByName,
      when: formatDateTime(r.createdAt),
    })),
  );

  const totalAmount = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const bonusPool = Math.round(totalAmount * DISPUTE_BONUS_RATE * 100) / 100;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Disputes</h1>
          <p className="text-xs text-muted">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin ? (
            <Link
              href="/disputes/history"
              className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              <History size={15} strokeWidth={1.75} />
              History
            </Link>
          ) : null}
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs text-muted">This period</p>
            <p className="text-lg font-semibold tabular-nums">{rows.length.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-4xl flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card icon={Gavel} label="Disputes" value={String(rows.length)} sub="logged this period" />
            <Card icon={Coins} label="Recovered" value={formatUSD(totalAmount)} sub="total disputed amount" />
            <Card
              icon={HandCoins}
              label="Bonus pool"
              value={formatUSD(bonusPool)}
              sub="5% across submitters"
            />
          </div>

          <DisputesClient
            categories={categories}
            items={items}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
          />
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

function NoAccess() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Disputes</h1>
          <p className="text-xs text-muted">Restricted</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center border border-border bg-surface">
            <Lock size={26} strokeWidth={1.5} className="text-muted" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Restricted</h2>
            <p className="mt-1 text-sm text-muted">
              Disputes are available to the Disputes role and admins. Ask an admin to assign you the
              Disputes role in Payments if you need access.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

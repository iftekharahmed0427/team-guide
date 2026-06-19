import { desc, isNull } from "drizzle-orm";
import Link from "next/link";
import { Star, History } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { review, reportPeriod } from "@/db/app-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { signedGetUrl } from "@/lib/storage";
import ReviewForm from "./review-form";
import ReviewDeleteButton from "./review-delete-button";
import ReviewLightbox from "./review-lightbox";

// A stored key needs a short-lived presigned URL; a legacy inline data URL is
// already renderable as-is.
async function displayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return (await signedGetUrl(imageUrl)) ?? "";
}

const SOURCE_LABEL: Record<string, string> = {
  trustpilot: "Trustpilot",
  google: "Google",
};
const SOURCE_BADGE: Record<string, string> = {
  trustpilot: "border-emerald-500/40 text-emerald-400",
  google: "border-sky-500/40 text-sky-400",
};

// Manual Trustpilot/Google review counter. Admins log each review with a
// screenshot; everyone can see the counts and the evidence for the current
// period. Reviews archive into history when an admin runs "Reset all" (they
// share the report period). Live via the app_event SSE bus.
export default async function ReviewsPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  // Current period = reviews not yet archived (periodId is null).
  const rows = await db
    .select()
    .from(review)
    .where(isNull(review.periodId))
    .orderBy(desc(review.createdAt));

  const lastArchive = (
    await db
      .select({ endedAt: reportPeriod.endedAt })
      .from(reportPeriod)
      .orderBy(desc(reportPeriod.endedAt))
      .limit(1)
  )[0];
  const periodLabel = lastArchive?.endedAt
    ? `Current period: since ${formatDate(lastArchive.endedAt)}`
    : "Current period: ongoing (no reset yet)";

  // Resolve a renderable URL for each screenshot (presigned for stored keys).
  const items = await Promise.all(
    rows.map(async (r) => ({ ...r, src: await displayUrl(r.imageUrl) })),
  );

  const trustpilot = rows.filter((r) => r.source === "trustpilot").length;
  const google = rows.filter((r) => r.source === "google").length;
  const total = rows.length;

  const counters = [
    { label: "Trustpilot", value: trustpilot, tone: "text-emerald-400" },
    { label: "Google", value: google, tone: "text-sky-400" },
    { label: "Total", value: total, tone: "text-foreground" },
  ];

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Reviews</h1>
          <p className="text-xs text-muted">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/reviews/history"
            className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
          >
            <History size={15} strokeWidth={1.75} />
            History
          </Link>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-xs text-muted">This period</p>
            <p className="text-lg font-semibold tabular-nums">{total.toLocaleString()}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {counters.map((c) => (
              <div key={c.label} className="border border-border bg-surface p-4 text-center">
                <p className={`text-3xl font-semibold tabular-nums ${c.tone}`}>{c.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-muted">{c.label}</p>
              </div>
            ))}
          </div>

          {isAdmin ? <ReviewForm /> : null}

          <h2 className="px-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
            This period&apos;s reviews
          </h2>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 border border-border bg-surface px-5 py-16 text-center">
              <Star size={22} strokeWidth={1.5} className="text-muted" />
              <p className="text-sm text-muted">
                No reviews logged yet this period.
                {isAdmin ? " Add one above." : ""}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <div key={r.id} className="flex flex-col border border-border bg-surface">
                  <ReviewLightbox
                    src={r.src}
                    alt={`${SOURCE_LABEL[r.source] ?? "Review"} screenshot`}
                  />
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${SOURCE_BADGE[r.source] ?? "border-border text-muted"}`}
                      >
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </span>
                      {isAdmin ? <ReviewDeleteButton id={r.id} /> : null}
                    </div>
                    {r.note ? <p className="text-sm text-foreground">{r.note}</p> : null}
                    <p className="mt-auto text-xs text-muted">
                      {r.addedByName || "Admin"} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

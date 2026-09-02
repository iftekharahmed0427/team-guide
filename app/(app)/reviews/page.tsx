import { getSession } from "@/lib/auth";
import Link from "next/link";
import { asc, desc, isNull } from "drizzle-orm";
import { Clock, Star } from "lucide-react";
import { db } from "@/db";
import {
  review,
  reviewBonusMember,
  reviewSetting,
  reviewSource,
  reportPeriod,
} from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { fileUrl } from "@/lib/storage";
import { plainName } from "../member";
import LogReview, { type Source } from "./log-review";
import BonusCard from "./bonus-card";
import ReviewEvidence from "./review-evidence";
import EligibleMembers, { type StaffMember } from "./eligible-members";

// /reviews - the manual review counter from the "reviews-page" Figma frame
// (node 163:4): a stat card per source, the log form, this period's reviews, and
// the bonus rule with its eligible members.
//
// Reads the real review tables. The current period is everything not yet
// archived (periodId null), the same rule the live page uses; the subtitle dates
// it from the last "Reset all".
//
// The frame pads the page 40 where the rest of v2 uses 32. Kept at 32 so it
// matches its neighbours; everything inside is the frame's.

// A stored key needs the /api/files route; a legacy inline data URL is already
// renderable. fileUrl returns null when STORAGE_DIR is unset, as in local
// development - those are dropped rather than drawn broken.
async function displayUrl(imageUrl: string): Promise<string | null> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  return fileUrl(imageUrl);
}

export default async function ReviewsPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  // Selected directly rather than through lib/reviews' getReviewSources, which
  // seeds the catalog on read.
  const sources = await db
    .select()
    .from(reviewSource)
    .orderBy(asc(reviewSource.sortOrder));

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

  const setting = (await db.select().from(reviewSetting).limit(1))[0];

  const staffRows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
    })
    .from(user)
    .orderBy(asc(user.name));
  const eligibleIds = new Set(
    (
      await db
        .select({ userId: reviewBonusMember.userId })
        .from(reviewBonusMember)
    ).map((m) => m.userId),
  );
  // The bonus is for members, not admins - the live page lists the same set.
  const staff: StaffMember[] = staffRows
    .filter((m) => m.role !== "admin")
    .map((m) => ({
      id: m.id,
      name: plainName(m.name || m.email || "Member"),
      image: m.image ?? null,
      eligible: eligibleIds.has(m.id),
    }));

  const countOf = (sourceId: string) =>
    rows.filter((r) => r.source === sourceId).length;
  const total = rows.length;

  const items = (
    await Promise.all(
      rows.map(async (r) => ({ ...r, src: await displayUrl(r.imageUrl) })),
    )
  ).filter((r) => r.src);

  const card = "rounded-[12px] border border-[#243033]! bg-[#171e24]";
  const sectionLabel = "text-[12px] font-bold text-[#8fb0a7] uppercase";

  const stats = [
    ...sources.map((s) => ({
      key: s.id,
      name: s.name,
      count: countOf(s.id),
      total: false,
    })),
    { key: "__total", name: "Total", count: total, total: true },
  ];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[32px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Reviews</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            {periodLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          <Link
            href="/reviews/history"
            className="flex items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            <Clock size={14} strokeWidth={2} className="text-[#94a3b8]" />
            History
          </Link>
          <p className="rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#8fb0a7]">
            This period: {total}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-[24px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[24px]">
          <div className="flex items-start gap-[12px]">
            {stats.map((stat) => (
              <div
                key={stat.key}
                className={`flex min-w-0 flex-1 flex-col gap-[12px] overflow-hidden rounded-[12px] border p-[20px] shadow-[0px_10px_24px_-10px_rgba(0,0,0,0.2)] ${
                  stat.total
                    ? "border-[#8fb0a7]! bg-[#0e1217]"
                    : "border-[#243033]! bg-[#171e24]"
                }`}
              >
                <p className="truncate text-[40px] font-bold text-[#e2e8f0]">
                  {stat.count}
                </p>
                <p className="w-full text-[13px] font-bold text-[#94a3b8] uppercase">
                  {stat.name}
                </p>
              </div>
            ))}
          </div>

          <LogReview sources={sources as Source[]} />

          <div className="flex flex-col gap-[12px]">
            <div className="flex items-start pb-[4px]">
              <p className={sectionLabel}>This period&apos;s reviews</p>
            </div>

            {items.length === 0 ? (
              <div
                className={`flex flex-col items-center justify-center gap-[16px] p-[48px] ${card}`}
              >
                <span className="rounded-full bg-[#0e1217] p-[16px]">
                  <Star size={24} strokeWidth={2} className="text-[#64748b]" />
                </span>
                <div className="flex w-full flex-col items-center gap-[6px] text-center">
                  <p className="text-[15px] font-semibold text-[#e2e8f0]">
                    No reviews logged yet this period
                  </p>
                  <p className="text-[13px] font-normal text-[#64748b]">
                    Add one above to track team rewards and bonuses.
                  </p>
                </div>
              </div>
            ) : (
              // The frame only draws the empty state - the dev database has no
              // reviews in the current period - so the populated list reuses the
              // screenshot tiles from the audit review.
              <ReviewEvidence
                isAdmin={isAdmin}
                items={items.map((item) => ({
                  id: item.id,
                  src: item.src,
                  sourceName:
                    sources.find((s) => s.id === item.source)?.name ?? item.source,
                  note: item.note,
                  when: formatDateTime(item.createdAt),
                }))}
              />
            )}
          </div>
        </div>

        <div className="flex w-[420px] shrink-0 flex-col gap-[24px]">
          <BonusCard
            threshold={setting?.threshold ?? 50}
            amount={setting?.amount ?? 50}
            total={total}
          />
          <EligibleMembers members={staff} />
        </div>
      </div>
    </div>
  );
}

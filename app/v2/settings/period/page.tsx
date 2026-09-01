import Link from "next/link";
import { count, desc, eq, isNull, sum } from "drizzle-orm";
import { AlertTriangle, ArrowUpRight, RotateCcw } from "lucide-react";
import { db } from "@/db";
import {
  botSetting,
  dispute,
  reportChannel,
  reportPeriod,
  review,
} from "@/db/app-schema";
import { formatDate } from "@/lib/datetime";
import { CARD, Row, SettingsHeader, Section } from "../settings-ui";

// /v2/settings/period - the period, given a page of its own.
//
// Two problems this fixes. "Reset all" is the most consequential action in the
// portal (it closes the period and archives the reports standings, the reviews,
// the disputes and the payments), and today it sits at the bottom of the Discord
// bot page inside "Report channels", named as if it only touched channels. And
// `periodDays`, which drives the reports label, the payments window and the
// bot's report range, has no editor anywhere: it can only be changed in the
// database.
//
// Read-only here, like the rest of v2 settings. The button is inert by design:
// a canvas page must not be able to close a period.

const DAY_MS = 1000 * 60 * 60 * 24;

export default async function V2SettingsPeriodPage() {
  const [setting, lastPeriod, channels, openReviews, openDisputes] =
    await Promise.all([
      db
        .select({ periodDays: botSetting.periodDays })
        .from(botSetting)
        .where(eq(botSetting.id, "singleton"))
        .limit(1),
      db
        .select({ endedAt: reportPeriod.endedAt })
        .from(reportPeriod)
        .orderBy(desc(reportPeriod.endedAt))
        .limit(1),
      db
        .select({ n: count(), tickets: sum(reportChannel.currentCount) })
        .from(reportChannel),
      db.select({ n: count() }).from(review).where(isNull(review.periodId)),
      db.select({ n: count() }).from(dispute).where(isNull(dispute.periodId)),
    ]);

  const periodDays = setting[0]?.periodDays ?? 14;
  const startedAt = lastPeriod[0]?.endedAt ?? null;
  // Reading the clock is impure, which the purity rule flags even in a server
  // component. This one is rendered per request on the server, so there is no
  // re-render for the value to drift across.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const elapsed = startedAt
    ? Math.max(0, Math.floor((nowMs - startedAt.getTime()) / DAY_MS))
    : null;

  // `sum` comes back as a string (or null on an empty table), the way Postgres
  // returns a numeric aggregate.
  const tickets = Number(channels[0]?.tickets ?? 0);

  const archives = [
    {
      label: "Report standings",
      value: `${tickets.toLocaleString()} tickets across ${channels[0]?.n ?? 0} channels`,
      href: "/v2/reports/history",
    },
    {
      label: "Reviews",
      value: `${openReviews[0]?.n ?? 0} logged this period`,
      href: "/v2/reviews/history",
    },
    {
      label: "Disputes",
      value: `${openDisputes[0]?.n ?? 0} logged this period`,
      href: "/v2/disputes/history",
    },
    {
      label: "Payments",
      value: "The period's payroll sheet",
      href: "/v2/payments/history",
    },
  ];

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <SettingsHeader
        title="Period"
        subtitle="How long a period runs, and the one action that closes it"
      />

      <Section
        title="Current period"
        hint="A period runs from the last reset until the next one. Nothing closes it automatically."
      >
        <Row
          label="Started"
          hint={startedAt ? undefined : "No period has been closed yet"}
          value={startedAt ? formatDate(startedAt) : "At the beginning"}
        />
        <Row
          label="Running for"
          value={elapsed === null ? "-" : `${elapsed} day${elapsed === 1 ? "" : "s"}`}
        />
        <Row
          label="Period length"
          hint="Drives the reports period label, the payments window and the bot's report range"
          value={`${periodDays} days`}
          tone="accent"
        />
      </Section>

      <Section
        title="Ending the period"
        hint="One action archives everything below, zeroes the live counts, and tells the bot to post the closing report."
        footer="Today this lives on the Discord bot page, at the bottom of Report channels, labelled Reset all."
      >
        <div className="flex flex-col">
          {archives.map((a) => (
            <div
              key={a.label}
              className="flex items-center justify-between gap-[16px] border-b border-[#243033]! py-[14px] first:pt-0 last:border-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="text-[14px] font-semibold text-[#e2e8f0]">
                  {a.label}
                </p>
                <p className="text-[12px] font-normal text-[#64748b]">
                  {a.value}
                </p>
              </div>
              <Link
                href={a.href}
                className="inline-flex shrink-0 items-center gap-[4px] text-[12px] font-semibold text-[#94a3b8] transition-colors hover:text-[#8fb0a7]"
              >
                Archive
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-[20px] flex items-center justify-between gap-[16px] rounded-[8px] border border-[#f59e0b]/40! bg-[#f59e0b]/[0.06] p-[16px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            <AlertTriangle
              size={16}
              strokeWidth={2}
              className="shrink-0 text-[#f59e0b]"
            />
            <p className="min-w-0 text-[13px] font-medium text-[#f59e0b]">
              This cannot be undone. Everything above moves to history and the
              counts start from zero.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Inert on the redesign canvas"
            className="flex shrink-0 cursor-default items-center gap-[8px] rounded-[6px] bg-[#f59e0b] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] opacity-60"
          >
            <RotateCcw size={14} strokeWidth={2} />
            End period
          </button>
        </div>
      </Section>

      <div className={`flex flex-col gap-[6px] p-[20px] ${CARD}`}>
        <p className="text-[14px] font-semibold text-[#e2e8f0]">
          Period length has no editor today
        </p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The value above is real and three things read it, but nothing in the
          portal can change it: it is set in the database. Making it editable is
          part of wiring this page up.
        </p>
      </div>
    </div>
  );
}

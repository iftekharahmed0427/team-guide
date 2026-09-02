import Link from "next/link";
import { count, desc, eq, isNull, sum } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/db";
import {
  botSetting,
  dispute,
  reportChannel,
  reportPeriod,
  review,
} from "@/db/app-schema";
import { formatDate } from "@/lib/datetime";
import { Row, SettingsHeader, Section } from "../settings-ui";
import { EndPeriodButton, PeriodLengthForm } from "./period-forms";

// /settings/period - the period, given a page of its own.
//
// Two problems this fixes. "Reset all" is the most consequential action in the
// portal (it closes the period and archives the reports standings, the reviews,
// the disputes and the payments), and today it sits at the bottom of the Discord
// bot page inside "Report channels", named as if it only touched channels. And
// `periodDays`, which drives the reports label, the payments window and the
// bot's report range, had no editor anywhere: it could only be changed in the
// database. This page is the first one.
//
// Ending a period calls the same action the live page does. It is the one write
// in the portal with no undo, so it asks twice: once to arm, once to type the
// words.

const DAY_MS = 1000 * 60 * 60 * 24;

export default async function SettingsPeriodPage() {
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
      href: "/reports/history",
    },
    {
      label: "Reviews",
      value: `${openReviews[0]?.n ?? 0} logged this period`,
      href: "/reviews/history",
    },
    {
      label: "Disputes",
      value: `${openDisputes[0]?.n ?? 0} logged this period`,
      href: "/disputes/history",
    },
    {
      label: "Payments",
      value: "The period's payroll sheet",
      href: "/payments/history",
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
      </Section>

      <Section
        title="Period length"
        hint="How long a period is measured as. Ending one is still manual: this only sets the window the reports and payments pages describe."
      >
        <PeriodLengthForm initial={periodDays} />
      </Section>

      <Section
        title="Ending the period"
        hint="One action archives everything below, zeroes the live counts, and tells the bot to post the closing report."
        footer="On the live settings this is Reset all, at the bottom of the Discord bot page under Report channels."
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

        <EndPeriodButton channelCount={channels[0]?.n ?? 0} />

      </Section>

    </div>
  );
}

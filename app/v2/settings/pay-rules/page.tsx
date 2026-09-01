import { count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { review, reviewSetting } from "@/db/app-schema";
import { TICKET_RATE } from "@/app/(app)/payments/constants";
import { DISPUTE_BONUS_RATE } from "@/lib/disputes";
import { REVIEW_BONUS_DEFAULTS } from "@/lib/reviews";
import { CARD, EditsOn, Row, SettingsHeader, Section } from "../settings-ui";

// /v2/settings/pay-rules - the numbers behind every payout, in one place.
//
// These are the settings an admin cannot currently find because two of them are
// not settings at all: the ticket rate and the dispute bonus rate are constants
// in the code, and the review bonus rule is edited inline on /reviews rather
// than anywhere in settings. Collecting them here is the point of the page,
// even while it only reads.

export default async function V2SettingsPayRulesPage() {
  const [bonusRow, periodReviews] = await Promise.all([
    db
      .select({
        threshold: reviewSetting.threshold,
        amount: reviewSetting.amount,
      })
      .from(reviewSetting)
      .where(eq(reviewSetting.id, "singleton"))
      .limit(1),
    db.select({ n: count() }).from(review).where(isNull(review.periodId)),
  ]);

  const bonus = bonusRow[0] ?? REVIEW_BONUS_DEFAULTS;
  const logged = periodReviews[0]?.n ?? 0;
  const met = logged >= bonus.threshold;

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <SettingsHeader
        title="Pay rules"
        subtitle="The numbers behind every payout"
      />

      <Section
        title="Ticket pay"
        hint="What a solved ticket is worth to a member on a per-ticket role."
        footer="Set in the code, not the database. It becomes editable when this page is wired up."
      >
        <Row
          label="Ticket rate"
          hint="Multiplied by the member's ticket count on Payments"
          value={`$${TICKET_RATE} per ticket`}
          tone="accent"
        />
      </Section>

      <Section
        title="Dispute bonus"
        hint="A share of what the team recovers from won disputes, split across the members who logged them."
        footer="Set in the code, not the database. It becomes editable when this page is wired up."
      >
        <Row
          label="Bonus rate"
          hint="Of each won dispute's amount, added to the submitter's bonus"
          value={`${Math.round(DISPUTE_BONUS_RATE * 100)}%`}
          tone="accent"
        />
        <Row
          label="Counts towards it"
          hint="Lost and refunded disputes are logged but pay nothing"
          value="Won disputes only"
        />
      </Section>

      <Section
        title="Review bonus"
        hint="A flat amount for each eligible member, paid only when the team hits the target for the period."
        footer={
          <span className="flex items-center gap-[8px]">
            Edited on the Reviews page today, not in settings.
            <EditsOn href="/v2/reviews" label="Open Reviews" />
          </span>
        }
      >
        <Row
          label="Target"
          hint="Team total reviews needed in the period"
          value={`${bonus.threshold} reviews`}
          tone="accent"
        />
        <Row
          label="Amount"
          hint="Per eligible member, once the target is met"
          value={`$${bonus.amount}`}
          tone="accent"
        />
        <Row
          label="This period"
          hint={
            met
              ? "The target is met, so the bonus pays out"
              : `${bonus.threshold - logged} more to reach the target`
          }
          value={`${logged} logged`}
        />
      </Section>

      <div className={`flex flex-col gap-[6px] p-[20px] ${CARD}`}>
        <p className="text-[14px] font-semibold text-[#e2e8f0]">
          Two of these live in the code
        </p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The ticket rate and the dispute bonus rate are constants, so changing
          either one is a deploy today. Moving them into the database is an
          additive migration, and it is what makes this page editable.
        </p>
      </div>
    </div>
  );
}

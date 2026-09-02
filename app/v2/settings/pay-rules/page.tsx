import { count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { review, reviewSetting } from "@/db/app-schema";
import { TICKET_RATE } from "@/lib/payment-constants";
import { DISPUTE_BONUS_RATE } from "@/lib/disputes";
import { REVIEW_BONUS_DEFAULTS } from "@/lib/reviews";
import { Row, SettingsHeader, Section } from "../settings-ui";
import ReviewBonusForm from "./review-bonus-form";

// /v2/settings/pay-rules - the numbers behind every payout, in one place.
//
// These are the settings an admin cannot currently find because two of them are
// not settings at all: the ticket rate and the dispute bonus rate are constants
// in the code, and the review bonus rule is edited inline on /reviews rather
// than anywhere in settings.
//
// The review bonus is editable here, through the Reviews page's own action. The
// other two are shown but not editable: they have no column to write to, so
// making them settings needs a migration and a change to the code that reads
// them.

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

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <SettingsHeader
        title="Pay rules"
        subtitle="The numbers behind every payout"
      />

      <Section
        title="Ticket pay"
        hint="What a solved ticket is worth to a member on a per-ticket role."
        footer="A constant in the code, so changing it is a deploy. Making it editable needs a column to write to."
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
        footer="A constant in the code, so changing it is a deploy. Making it editable needs a column to write to."
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
        footer="Which members are eligible is ticked per member on the Reviews page."
      >
        <ReviewBonusForm
          initial={{ threshold: bonus.threshold, amount: bonus.amount }}
          logged={logged}
        />
      </Section>
    </div>
  );
}

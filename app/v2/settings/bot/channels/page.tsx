import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reportChannel } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../../../member";
import { CARD, Section } from "../../settings-ui";
import ChannelsManager from "./channels-manager";

// /v2/settings/bot/channels - the channels the bot counts screenshots in.
//
// One row per channel with whose it is and where its count stands. A channel
// with no member counts every upload in it, which the live page says in a
// footnote and this says on the row itself.

export default async function V2BotChannelsPage() {
  const [channels, memberRows] = await Promise.all([
    db.select().from(reportChannel).orderBy(asc(reportChannel.createdAt)),
    db
      .select({
        name: userTable.name,
        email: userTable.email,
        discordId: account.accountId,
      })
      .from(userTable)
      .innerJoin(
        account,
        and(eq(account.userId, userTable.id), eq(account.providerId, "discord")),
      )
      .orderBy(asc(userTable.createdAt)),
  ]);

  const members = memberRows.map((m) => ({
    discordId: m.discordId,
    name: plainName(m.name || m.email || "Member"),
  }));
  const names = new Map(members.map((m) => [m.discordId, m.name]));

  return (
    <div className="flex flex-col gap-[16px]">
      <Section
        title="Report channels"
        hint="Each channel is scanned for screenshot uploads. A count runs from its last reset until the period ends."
      >
        <ChannelsManager
          members={members}
          channels={channels.map((c) => ({
            id: c.id,
            channelId: c.channelId,
            name: c.name,
            owner: c.userId
              ? (names.get(c.userId) ?? `Discord ${c.userId}`)
              : "Everyone in it",
            currentCount: c.currentCount,
            since: c.countResetAt
              ? formatDateTime(c.countResetAt)
              : "The beginning",
          }))}
        />
      </Section>

      <div className={`flex flex-col gap-[6px] p-[20px] ${CARD}`}>
        <p className="text-[14px] font-semibold text-[#e2e8f0]">
          Ending a period lives on its own page now
        </p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The live settings put &ldquo;Reset all&rdquo; at the top of this list,
          which reads like a channel utility. It closes the period and archives
          the reports, reviews, disputes and payments, so it sits under Period.
          Resetting one channel here is the smaller thing: it only zeroes that
          channel&apos;s count.
        </p>
      </div>
    </div>
  );
}

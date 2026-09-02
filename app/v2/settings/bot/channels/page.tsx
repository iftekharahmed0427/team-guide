import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { reportChannel } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../../../member";
import { Section } from "../../settings-ui";
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
        and(
          eq(account.userId, userTable.id),
          eq(account.providerId, "discord"),
        ),
      )
      .orderBy(asc(userTable.createdAt)),
  ]);

  const members = memberRows.map((m) => ({
    discordId: m.discordId,
    name: plainName(m.name || m.email || "Member"),
  }));
  const names = new Map(members.map((m) => [m.discordId, m.name]));

  return (
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
  );
}

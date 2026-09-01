import { and, asc, eq } from "drizzle-orm";
import { Hash } from "lucide-react";
import { db } from "@/db";
import { reportChannel } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../../../member";
import { CARD, Section } from "../../settings-ui";

// /v2/settings/bot/channels - the channels the bot counts screenshots in.
//
// One row per channel with whose it is and where its count stands. A channel
// with no member counts every upload in it, which the live page says in a
// footnote and this says on the row itself.

export default async function V2BotChannelsPage() {
  const [channels, memberRows] = await Promise.all([
    db.select().from(reportChannel).orderBy(asc(reportChannel.createdAt)),
    db
      .select({ name: userTable.name, discordId: account.accountId })
      .from(userTable)
      .innerJoin(
        account,
        and(eq(account.userId, userTable.id), eq(account.providerId, "discord")),
      ),
  ]);

  const names = new Map(
    memberRows.map((m) => [m.discordId, plainName(m.name || "Member")]),
  );
  const total = channels.reduce((sum, c) => sum + c.currentCount, 0);

  const COL = {
    channel: "min-w-0 flex-1",
    member: "w-[180px]",
    count: "w-[90px] text-right",
    reset: "w-[170px] text-right",
  };

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px]">
      <Section
        title="Report channels"
        hint="Each channel is scanned for screenshot uploads. A count runs from its last reset until the period ends."
        footer={`${channels.length} channel${channels.length === 1 ? "" : "s"}, ${total.toLocaleString()} tickets counted this period.`}
      >
        {channels.length === 0 ? (
          <p className="py-[8px] text-[13px] font-normal text-[#64748b]">
            No report channels yet, so nothing is being counted.
          </p>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center rounded-[6px] bg-[#0e1217] px-[14px] py-[10px] text-[11px] font-bold text-[#94a3b8] uppercase">
              <p className={COL.channel}>Channel</p>
              <p className={COL.member}>Counts for</p>
              <p className={COL.count}>Tickets</p>
              <p className={COL.reset}>Counting since</p>
            </div>

            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center border-b border-[#243033]! px-[14px] py-[12px] last:border-0"
              >
                <div className={`flex items-center gap-[10px] ${COL.channel}`}>
                  <Hash
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-[#64748b]"
                  />
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                      {c.name || "Unnamed channel"}
                    </p>
                    <p className="truncate font-mono text-[11px] font-normal text-[#64748b]">
                      {c.channelId}
                    </p>
                  </div>
                </div>
                <p
                  className={`truncate pr-[12px] text-[13px] font-normal text-[#94a3b8] ${COL.member}`}
                >
                  {c.userId
                    ? (names.get(c.userId) ?? `Discord ${c.userId}`)
                    : "Everyone in it"}
                </p>
                <p
                  className={`text-[14px] font-bold text-[#e2e8f0] tabular-nums ${COL.count}`}
                >
                  {c.currentCount.toLocaleString()}
                </p>
                <p
                  className={`text-[12px] font-normal text-[#64748b] ${COL.reset}`}
                >
                  {c.countResetAt
                    ? formatDateTime(c.countResetAt)
                    : "The beginning"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className={`flex flex-col gap-[6px] p-[20px] ${CARD}`}>
        <p className="text-[14px] font-semibold text-[#e2e8f0]">
          Ending a period lives on its own page now
        </p>
        <p className="text-[13px] font-normal text-[#94a3b8]">
          The live settings put &ldquo;Reset all&rdquo; at the top of this list,
          which reads like a channel utility. It closes the period and archives
          the reports, reviews, disputes and payments, so it sits under Period.
        </p>
      </div>
    </div>
  );
}

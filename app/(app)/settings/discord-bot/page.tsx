import { and, asc, eq } from "drizzle-orm";
import { Hash, Trash2 } from "lucide-react";
import { db } from "@/db";
import { reportChannel, botSetting } from "@/db/app-schema";
import { user as userTable, account } from "@/db/auth-schema";
import { getBotStatusPayload } from "./status";
import { deleteReportChannel } from "./actions";
import BotStatusPanel from "./bot-status-panel";
import BotControls from "./bot-controls";
import TokenForm from "./token-form";
import PresenceForm from "./presence-form";
import ScheduleForm from "./schedule-form";
import AnnouncementForm from "./announcement-form";
import ReportChannelForm from "./report-channel-form";
import ResetChannelButton from "./reset-channel-button";
import ReportChannelsControls from "./report-channels-controls";

export default async function DiscordBotSettingsPage() {
  const settingRow = (
    await db.select().from(botSetting).where(eq(botSetting.id, "singleton")).limit(1)
  )[0];

  const token = settingRow?.token ?? null;
  const hasToken = !!token;
  const tokenLast4 = token ? token.slice(-4) : null;
  const enabled = settingRow?.enabled ?? true;
  const autoReset = settingRow?.autoReset ?? true;
  const presence = {
    presenceStatus: settingRow?.presenceStatus ?? "online",
    presenceActivityType: settingRow?.presenceActivityType ?? "none",
    presenceActivityText: settingRow?.presenceActivityText ?? "",
  };
  const schedule = {
    periodAnchor: settingRow?.periodAnchor ?? "2026-06-26",
    periodDays: settingRow?.periodDays ?? 14,
    postHour: settingRow?.postHour ?? 17,
    postMinute: settingRow?.postMinute ?? 0,
  };
  const announcement = {
    announcementChannelId: settingRow?.announcementChannelId ?? "",
    announcementEnabled: settingRow?.announcementEnabled ?? false,
    announcementTitle: settingRow?.announcementTitle ?? "Ticket count for this period",
    announcementColor: settingRow?.announcementColor ?? "#5865f2",
    announcementIntro: settingRow?.announcementIntro ?? "",
    announcementFooter: settingRow?.announcementFooter ?? "Team Guide",
  };

  const status = await getBotStatusPayload();

  const channels = await db
    .select()
    .from(reportChannel)
    .orderBy(asc(reportChannel.createdAt));

  const memberRows = await db
    .select({ name: userTable.name, email: userTable.email, discordId: account.accountId })
    .from(userTable)
    .innerJoin(
      account,
      and(eq(account.userId, userTable.id), eq(account.providerId, "discord")),
    )
    .orderBy(asc(userTable.createdAt));
  const members = memberRows.map((m) => ({
    discordId: m.discordId,
    name: m.name || m.email || "Member",
  }));

  const card = "border border-border bg-surface";
  const cardHead = "border-b border-border px-5 py-4";

  return (
    <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Discord bot</h2>
        <p className="text-xs text-muted">
          Status, credentials, presence, schedule, and report channels for the
          ticket-counting bot.
        </p>
      </div>

      {/* Status */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Status</h3>
        </div>
        <div className="p-5">
          <BotStatusPanel initial={status} />
        </div>
      </section>

      {/* Controls */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Controls</h3>
          <p className="text-xs text-muted">
            Pause posting, or run a report immediately to test.
          </p>
        </div>
        <div className="p-5">
          <BotControls enabled={enabled} hasToken={hasToken} />
        </div>
      </section>

      {/* Token */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Bot token</h3>
          <p className="text-xs text-muted">
            Found in the Discord Developer Portal, in your app&apos;s Bot tab, under
            Reset Token. Stored securely and never shown again after saving.
          </p>
        </div>
        <div className="p-5">
          <TokenForm hasToken={hasToken} tokenLast4={tokenLast4} />
        </div>
      </section>

      {/* Presence */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Presence</h3>
          <p className="text-xs text-muted">How the bot appears in Discord.</p>
        </div>
        <div className="p-5">
          <PresenceForm presence={presence} />
        </div>
      </section>

      {/* Schedule */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Schedule</h3>
          <p className="text-xs text-muted">
            Period length and when the summary is posted (all times UTC).
          </p>
        </div>
        <div className="p-5">
          <ScheduleForm settings={schedule} />
        </div>
      </section>

      {/* Announcement */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Announcement</h3>
          <p className="text-xs text-muted">
            A period-end leaderboard embed posted to a channel of your choice.
          </p>
        </div>
        <div className="p-5">
          <AnnouncementForm announcement={announcement} />
        </div>
      </section>

      {/* Report channels */}
      <section className={card}>
        <div className={cardHead}>
          <h3 className="text-sm font-semibold tracking-tight">Report channels</h3>
          <p className="text-xs text-muted">
            Each channel is scanned for screenshot uploads from its member.
            Counting starts after the most recent bot message in the channel;
            use Reset to zero a channel and count from now.
          </p>
        </div>

        <div className="border-b border-border p-5">
          <ReportChannelsControls autoReset={autoReset} channelCount={channels.length} />
        </div>

        <div className="border-b border-border p-5">
          <ReportChannelForm members={members} />
        </div>

        {channels.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            No report channels yet. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {channels.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface-2 text-muted">
                        <Hash size={15} strokeWidth={1.75} />
                      </div>
                      <div className="leading-tight">
                        <p className="font-medium">
                          {c.name || "Unassigned"}
                          {!c.userId ? (
                            <span className="text-muted"> · counts everyone</span>
                          ) : null}
                        </p>
                        <p className="font-mono text-xs text-muted">{c.channelId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-5 pl-3">
                    <div className="flex items-center justify-end gap-2">
                      <ResetChannelButton id={c.id} name={c.name} />
                      <form action={deleteReportChannel} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          aria-label="Remove channel"
                          className="inline-flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

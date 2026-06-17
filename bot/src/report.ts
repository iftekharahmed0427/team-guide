import { EmbedBuilder, type Client, type TextBasedChannel } from "discord.js";
import type { ReportEntry, Settings } from "./db.ts";
import { countChannelTickets } from "./count.ts";
import { formatRange, periodWindow } from "./period.ts";

type RunOptions = { dryRun?: boolean };

// Count every configured channel for the period ending at `end`, then post (or,
// in dry-run, log) a summary embed in each channel.
export async function runReport(
  client: Client,
  settings: Settings,
  channels: ReportEntry[],
  end: Date,
  opts: RunOptions = {},
): Promise<void> {
  const { start } = periodWindow(end, settings);
  const range = formatRange(start, end.getTime());
  console.log(
    `[report] period ${range}, ${channels.length} channel(s)` +
      (opts.dryRun ? " [dry-run]" : ""),
  );

  for (const entry of channels) {
    const label = entry.name || entry.userId || entry.channelId;
    const result = await countChannelTickets(client, entry, start);

    if (!result.ok) {
      console.error(`[report] ${label}: SKIPPED, ${result.error}`);
      continue;
    }
    console.log(`[report] ${label}: ${result.count} ticket(s)`);

    if (opts.dryRun) continue;

    try {
      const channel = (await client.channels.fetch(entry.channelId)) as TextBasedChannel | null;
      if (!channel || !channel.isSendable()) {
        console.error(`[report] ${label}: cannot send (missing Send Messages?)`);
        continue;
      }
      const mention = entry.userId ? `<@${entry.userId}>` : "";
      await channel.send({
        content: mention || undefined,
        embeds: [buildEmbed(result.count, range)],
      });
    } catch (err) {
      console.error(`[report] ${label}: send failed:`, err);
    }
  }
}

function buildEmbed(count: number, range: string): EmbedBuilder {
  const noun = count === 1 ? "ticket" : "tickets";
  return new EmbedBuilder()
    .setTitle("🎫 Ticket Report")
    .setColor(0x5865f2)
    .setDescription(
      count > 0
        ? `You solved **${count}** ${noun} this period. Nice work!`
        : "No tickets were logged this period.",
    )
    .addFields(
      { name: "Tickets", value: `**${count}**`, inline: true },
      { name: "Period", value: range, inline: true },
    )
    .setFooter({ text: "Team Guide · counts screenshot posts" })
    .setTimestamp(new Date());
}

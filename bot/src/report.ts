import { EmbedBuilder, type Client, type TextBasedChannel } from "discord.js";
import type { ReportEntry, Settings } from "./db.ts";
import { countWindow } from "./count.ts";
import { formatRange, periodWindow } from "./period.ts";

type RunOptions = { dryRun?: boolean };

// Count every configured channel for the period ending at `end`, post a summary
// embed in each channel, then (if enabled) post a ranked leaderboard to the
// announcement channel. In dry-run nothing is sent, only logged.
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

  const ranking: { name: string; count: number }[] = [];

  for (const entry of channels) {
    const label = entry.name || entry.userId || entry.channelId;
    // A manual reset only applies within the current period.
    const floor = entry.resetAt && entry.resetAt > start ? entry.resetAt : start;
    const result = await countWindow(client, entry, floor);

    if (!result.ok) {
      console.error(`[report] ${label}: SKIPPED, ${result.error}`);
      continue;
    }
    console.log(`[report] ${label}: ${result.count} ticket(s)`);
    ranking.push({ name: label, count: result.count });

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

  await postLeaderboard(client, settings, ranking, opts);
}

// ── Per-channel summary ───────────────────────────────────────────────────────

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
    .setFooter({ text: "Team Guide" })
    .setTimestamp(new Date());
}

// ── Leaderboard announcement ──────────────────────────────────────────────────

function parseColor(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  return m && m[1] ? parseInt(m[1], 16) : 0x5865f2;
}

// Top three get medals; everyone after is numbered #4, #5, …
const MEDALS = ["🥇", "🥈", "🥉"];

function buildLeaderboardEmbed(
  ranking: { name: string; count: number }[],
  settings: Settings,
): EmbedBuilder {
  const ranked = [...ranking].sort((a, b) => b.count - a.count);
  const lines = ranked.map((r, i) => {
    const noun = r.count === 1 ? "ticket" : "tickets";
    const rank = i < MEDALS.length ? MEDALS[i] : `**#${i + 1}**`;
    return `${rank} ${r.name} - ${r.count} ${noun}`;
  });
  const total = ranked.reduce((sum, r) => sum + r.count, 0);
  const body = lines.length > 0 ? lines.join("\n") : "No tickets were logged this period.";

  const sections: string[] = [];
  const intro = settings.announcementIntro.trim();
  if (intro) sections.push(intro);
  sections.push(body);
  sections.push(`**Total tickets done: ${total}**`);

  const embed = new EmbedBuilder()
    .setTitle(settings.announcementTitle.trim() || "Ticket count for this period")
    .setColor(parseColor(settings.announcementColor))
    .setDescription(sections.join("\n\n"))
    .setTimestamp(new Date());
  const footer = settings.announcementFooter.trim();
  if (footer) embed.setFooter({ text: footer });
  return embed;
}

// The optional message line posted as content above the embed (e.g. "Great job
// this period, {role}"). A role mention only notifies from `content`, never from
// inside an embed, so the ping lives here. `{role}` is replaced with the <@&id>
// mention; without the placeholder the mention is prepended. Works with a role
// (ping), without a role (plain message), or neither (empty).
function buildAnnouncementContent(settings: Settings): string {
  const roleId = settings.announcementRoleId?.trim();
  const mention = roleId ? `<@&${roleId}>` : "";
  const text = settings.announcementPingText.trim();
  if (!text) return mention;
  if (text.includes("{role}")) {
    return text.replace(/\{role\}/g, mention).replace(/ {2,}/g, " ").trim();
  }
  return mention ? `${mention} ${text}` : text;
}

async function postLeaderboard(
  client: Client,
  settings: Settings,
  ranking: { name: string; count: number }[],
  opts: RunOptions,
): Promise<void> {
  if (!settings.announcementEnabled || !settings.announcementChannelId) return;

  const embed = buildLeaderboardEmbed(ranking, settings);
  const content = buildAnnouncementContent(settings);
  const roleId = settings.announcementRoleId?.trim() || null;

  if (opts.dryRun) {
    console.log(
      `[report] leaderboard (dry-run):` +
        (content ? `\n${content}` : "") +
        `\n${embed.data.description ?? ""}`,
    );
    return;
  }

  try {
    const channel = (await client.channels.fetch(
      settings.announcementChannelId,
    )) as TextBasedChannel | null;
    if (!channel || !channel.isSendable()) {
      console.error("[report] announcement: cannot send (missing access / Send Messages?)");
      return;
    }
    // Whitelist only the configured role so the ping fires and nothing else
    // (@everyone/@here/users) can be mentioned from the content.
    await channel.send({
      content: content || undefined,
      embeds: [embed],
      allowedMentions: { parse: [], roles: roleId ? [roleId] : [] },
    });
    console.log("[report] leaderboard posted");
  } catch (err) {
    console.error("[report] announcement send failed:", err);
  }
}

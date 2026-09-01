import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSetting } from "@/db/app-schema";
import { Row, Section, Tag } from "../../settings-ui";

// /v2/settings/bot/announcement - the period-end leaderboard embed.
//
// The embed is generated, so what an admin sets here is only its dressing: the
// title, the colour, the lines around the ranking, and whether a role gets
// pinged above it. The preview makes that concrete, which the live page's stack
// of six text inputs does not.

export default async function V2BotAnnouncementPage() {
  const row = (
    await db
      .select()
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1)
  )[0];

  const enabled = row?.announcementEnabled ?? false;
  const channelId = row?.announcementChannelId ?? "";
  const title = row?.announcementTitle ?? "Ticket count for this period";
  const colour = row?.announcementColor ?? "#5865f2";
  const intro = row?.announcementIntro ?? "";
  const footer = row?.announcementFooter ?? "Team Guide";
  const roleId = row?.announcementRoleId ?? "";
  const pingText = row?.announcementPingText ?? "";

  // The ping line puts the mention where {role} is, or in front when the
  // placeholder is missing, which is what the bot does when it posts.
  const ping = roleId
    ? pingText.includes("{role}")
      ? pingText.replace("{role}", `@role`)
      : `@role ${pingText}`.trim()
    : null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px]">
      <Section
        title="Announcement"
        hint="A ranked embed posted when a period's report runs."
        footer="Read-only on the redesign canvas."
      >
        <Row
          label="Posting"
          value={
            enabled ? (
              <span className="text-[#10b981]">On</span>
            ) : (
              <span className="text-[#64748b]">Off</span>
            )
          }
        />
        <Row
          label="Channel"
          hint="The Discord channel the embed goes to"
          value={channelId || "Not set"}
        />
        <Row label="Title" value={title || "-"} />
        <Row
          label="Colour"
          value={
            <span className="flex items-center gap-[8px]">
              <span
                style={{ backgroundColor: colour }}
                className="size-[12px] rounded-[3px]"
              />
              {colour}
            </span>
          }
        />
        <Row label="Intro line" value={intro.trim() || "-"} />
        <Row label="Footer" value={footer.trim() || "-"} />
        <Row
          label="Ping"
          hint={roleId ? "Posted above the embed, where a mention notifies" : undefined}
          value={roleId ? `Role ${roleId}` : "No ping"}
        />
      </Section>

      <Section title="Preview" hint="The shape of the post, with a sample ranking.">
        <div className="flex flex-col gap-[10px]">
          {ping ? (
            <p className="text-[13px] font-normal text-[#94a3b8]">
              <span className="rounded-[4px] bg-[#8fb0a7]/15 px-[4px] py-[1px] font-semibold text-[#8fb0a7]">
                {ping}
              </span>
            </p>
          ) : null}

          <div className="flex gap-[12px] rounded-[6px] bg-[#0e1217] p-[16px]">
            <span
              style={{ backgroundColor: colour }}
              className="w-[4px] shrink-0 rounded-full"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
              <p className="text-[15px] font-bold text-[#e2e8f0]">
                {title || "Ticket count for this period"}
              </p>
              {intro.trim() ? (
                <p className="text-[13px] font-normal text-[#94a3b8]">
                  {intro.trim()}
                </p>
              ) : null}
              <div className="flex flex-col gap-[4px] text-[13px] font-normal text-[#94a3b8]">
                <p>1. A member, 128</p>
                <p>2. Another member, 96</p>
                <p>3. A third member, 74</p>
              </div>
              {footer.trim() ? (
                <p className="pt-[4px] text-[11px] font-normal text-[#64748b]">
                  {footer.trim()}
                </p>
              ) : null}
            </div>
          </div>

          {!enabled ? (
            <div className="flex items-center gap-[8px]">
              <Tag>Not posting</Tag>
              <p className="text-[12px] font-normal text-[#64748b]">
                The embed is configured but switched off, so a report runs
                without it.
              </p>
            </div>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

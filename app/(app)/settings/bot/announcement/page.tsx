import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSetting } from "@/db/app-schema";
import { Section } from "../../settings-ui";
import AnnouncementForm from "./announcement-form";

// /settings/bot/announcement - the period-end leaderboard embed.
//
// The embed is generated, so what an admin sets here is only its dressing: the
// title, the colour, the lines around the ranking, and whether a role gets
// pinged above it. The preview makes that concrete, which the live page's stack
// of six text inputs does not.

export default async function BotAnnouncementPage() {
  const row = (
    await db
      .select()
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1)
  )[0];

  return (
    <Section
      title="Announcement"
      hint="A ranked embed posted when a period's report runs."
    >
      <AnnouncementForm
        initial={{
          announcementChannelId: row?.announcementChannelId ?? "",
          announcementEnabled: row?.announcementEnabled ?? false,
          announcementTitle:
            row?.announcementTitle ?? "Ticket count for this period",
          announcementColor: row?.announcementColor ?? "#5865f2",
          announcementIntro: row?.announcementIntro ?? "",
          announcementFooter: row?.announcementFooter ?? "Team Guide",
          announcementRoleId: row?.announcementRoleId ?? "",
          announcementPingText: row?.announcementPingText ?? "",
        }}
      />
    </Section>
  );
}

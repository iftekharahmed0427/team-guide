import { SettingsHeader } from "../settings-ui";
import BotTabs from "./bot-tabs";

// The bot section shell: one header and one tab row above whichever panel is
// open, so the four pages read as one thing split up rather than four settings.

export default function BotSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <SettingsHeader
        title="Discord bot"
        subtitle="The bot that counts screenshot tickets and posts the period report"
      />

      <BotTabs />

      {children}
    </div>
  );
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSetting } from "@/db/app-schema";
import { Section } from "../../settings-ui";
import PresenceForm from "./presence-form";

// /settings/bot/presence - how the bot appears in the member list.

export default async function BotPresencePage() {
  const row = (
    await db
      .select({
        presenceStatus: botSetting.presenceStatus,
        presenceActivityType: botSetting.presenceActivityType,
        presenceActivityText: botSetting.presenceActivityText,
      })
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1)
  )[0];

  return (
    <Section
      title="Presence"
      hint="What members see beside the bot's name in Discord. The preview updates as you edit."
    >
      <PresenceForm
        initial={{
          presenceStatus: row?.presenceStatus ?? "online",
          presenceActivityType: row?.presenceActivityType ?? "none",
          presenceActivityText: row?.presenceActivityText ?? "",
        }}
      />
    </Section>
  );
}

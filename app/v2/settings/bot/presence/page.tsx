import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSetting } from "@/db/app-schema";
import { Row, Section } from "../../settings-ui";

// /v2/settings/bot/presence - how the bot appears in the member list.

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  invisible: "Invisible",
};

const DOT: Record<string, string> = {
  online: "bg-[#10b981]",
  idle: "bg-[#f59e0b]",
  dnd: "bg-[#ef4444]",
  invisible: "bg-[#64748b]",
};

export default async function V2BotPresencePage() {
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

  const status = row?.presenceStatus ?? "online";
  const type = row?.presenceActivityType ?? "none";
  const text = row?.presenceActivityText ?? "";
  const hasActivity = type !== "none" && text.trim().length > 0;

  return (
    <div className="flex flex-col gap-[16px]">
      <Section
        title="Presence"
        hint="What members see beside the bot's name in Discord."
        footer="Read-only on the redesign canvas."
      >
        <Row
          label="Status"
          value={
            <span className="flex items-center gap-[8px]">
              <span
                className={`size-[8px] rounded-full ${DOT[status] ?? "bg-[#64748b]"}`}
              />
              {STATUS_LABELS[status] ?? status}
            </span>
          }
        />
        <Row
          label="Activity"
          hint="Playing, Watching, Listening, Competing, or nothing at all"
          value={type === "none" ? "None" : type}
        />
        <Row
          label="Activity text"
          hint="The line after the activity word"
          value={text.trim() || "-"}
        />
      </Section>

      <Section title="Preview" hint="Roughly how the line reads in Discord.">
        <div className="flex items-center gap-[12px] rounded-[8px] bg-[#0e1217] p-[16px]">
          <span className="relative shrink-0">
            <span className="flex size-[36px] items-center justify-center rounded-full bg-[#8fb0a7] text-[13px] font-bold text-[#0e1217]">
              GH
            </span>
            <span
              className={`absolute right-[-1px] bottom-[-1px] size-[12px] rounded-full border-[2px] border-[#0e1217]! ${DOT[status] ?? "bg-[#64748b]"}`}
            />
          </span>
          <div className="flex min-w-0 flex-col gap-[2px]">
            <p className="text-[14px] font-semibold text-[#e2e8f0]">
              Gravel Host
            </p>
            <p className="truncate text-[12px] font-normal text-[#94a3b8]">
              {hasActivity
                ? `${type} ${text.trim()}`
                : STATUS_LABELS[status] ?? status}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

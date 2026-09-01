import { eq } from "drizzle-orm";
import { Play } from "lucide-react";
import { db } from "@/db";
import { botSetting, botStatus } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { Row, Section } from "../settings-ui";

// /v2/settings/bot - connection: is it up, what is it signed in as, and the
// token behind that. The live page keeps status, controls and token as three
// separate cards among six; they are one question, so they are one panel.

const STATE: Record<string, { label: string; tone: string }> = {
  online: { label: "Online", tone: "text-[#10b981]" },
  offline: { label: "Offline", tone: "text-[#64748b]" },
  error: { label: "Error", tone: "text-[#ef4444]" },
  no_token: { label: "No token set", tone: "text-[#f59e0b]" },
};

const when = (d: Date | null) => (d ? formatDateTime(d) : "Never");

export default async function V2BotConnectionPage() {
  const [settingRow, statusRow] = await Promise.all([
    db
      .select()
      .from(botSetting)
      .where(eq(botSetting.id, "singleton"))
      .limit(1),
    db.select().from(botStatus).where(eq(botStatus.id, "singleton")).limit(1),
  ]);

  const setting = settingRow[0];
  const status = statusRow[0];
  const token = setting?.token ?? null;
  const state = STATE[status?.state ?? "offline"] ?? {
    label: status?.state ?? "Unknown",
    tone: "text-[#94a3b8]",
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <Section
        title="Status"
        hint="Reported by the bot itself each time it checks in."
      >
        <Row
          label="State"
          value={<span className={state.tone}>{state.label}</span>}
        />
        <Row
          label="Signed in as"
          hint="The bot's Discord tag"
          value={status?.botTag ?? "-"}
        />
        <Row label="Last check-in" value={when(status?.lastHeartbeatAt ?? null)} />
        <Row label="Last report posted" value={when(status?.lastReportAt ?? null)} />
        {status?.lastError ? (
          <Row
            label="Last error"
            hint={when(status.lastErrorAt ?? null)}
            value={<span className="text-[#ef4444]">{status.lastError}</span>}
          />
        ) : null}
      </Section>

      <Section
        title="Token"
        hint="From the Discord Developer Portal, in your app's Bot tab under Reset Token. Stored once and never shown again."
      >
        <Row
          label="Bot token"
          hint={token ? "Saved. Only the last four characters are readable." : undefined}
          value={token ? `Set, ending ${token.slice(-4)}` : "Not set"}
          tone={token ? "accent" : "plain"}
        />
      </Section>

      <Section
        title="Run a report now"
        hint="Posts the current standings to Discord immediately. The bot never posts on its own: only this and ending a period make it publish."
        footer="Inert on the redesign canvas. The live page owns this action."
      >
        <div className="flex items-center justify-between gap-[16px] pt-[4px]">
          <p className="min-w-0 text-[13px] font-normal text-[#64748b]">
            Useful for checking the announcement looks right before a period
            ends.
          </p>
          <button
            type="button"
            disabled
            className="flex shrink-0 cursor-default items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] opacity-60"
          >
            <Play size={14} strokeWidth={2} />
            Run now
          </button>
        </div>
      </Section>
    </div>
  );
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { botSetting, botStatus } from "@/db/app-schema";
import { formatDateTime } from "@/lib/datetime";
import { Row, Section } from "../settings-ui";
import { RunNowButton, TokenForm } from "./connection-forms";

// /v2/settings/bot - connection: is it up, what is it signed in as, and the
// token behind that. The live page keeps status, controls and token as three
// separate cards among six; they are one question, so they are one panel.
//
// The token never leaves the server: only whether one is stored, and its last
// four characters, reach the browser.

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
        <TokenForm hasToken={!!token} last4={token ? token.slice(-4) : null} />
      </Section>

      <Section
        title="Run a report now"
        hint="Posts the current standings to Discord immediately. The bot never posts on its own: only this and ending a period make it publish."
      >
        <RunNowButton hasToken={!!token} />
      </Section>
    </div>
  );
}

import pg from "pg";

// Config lives in the same Supabase Postgres the website writes to, so admins
// edit the bot (token, presence, schedule, channels, enable, run-now) from the
// web UI and the bot reads it here at runtime. The bot writes its health/status
// back to bot_status, which the website displays.

export type Settings = {
  token: string | null;
  enabled: boolean;
  periodAnchor: string; // YYYY-MM-DD, a Friday a period ends on
  periodDays: number;
  postHour: number; // UTC
  postMinute: number; // UTC
  presenceStatus: string; // online|idle|dnd|invisible
  presenceActivityType: string; // none|Playing|Watching|Listening|Competing|Custom
  presenceActivityText: string;
  runRequestedAt: number; // ms epoch, 0 if never
};

export type ReportEntry = {
  channelId: string;
  userId: string | null; // Discord snowflake; null = count everyone's uploads
  name: string;
};

const DEFAULT_SETTINGS: Settings = {
  token: null,
  enabled: true,
  periodAnchor: "2026-06-26",
  periodDays: 14,
  postHour: 17,
  postMinute: 0,
  presenceStatus: "online",
  presenceActivityType: "none",
  presenceActivityText: "",
  runRequestedAt: 0,
};

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const useSsl = process.env.DATABASE_SSL !== "disable";
  pool = new pg.Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 2,
  });
  return pool;
}

export async function getSettings(): Promise<Settings> {
  const { rows } = await getPool().query(
    `select token, enabled, period_anchor, period_days, post_hour, post_minute,
            presence_status, presence_activity_type, presence_activity_text, run_requested_at
     from bot_setting where id = 'singleton' limit 1`,
  );
  const r = rows[0];
  if (!r) return DEFAULT_SETTINGS;
  return {
    token: r.token == null || String(r.token).trim() === "" ? null : String(r.token),
    enabled: r.enabled !== false,
    periodAnchor: String(r.period_anchor),
    periodDays: Number(r.period_days),
    postHour: Number(r.post_hour),
    postMinute: Number(r.post_minute),
    presenceStatus: String(r.presence_status ?? "online"),
    presenceActivityType: String(r.presence_activity_type ?? "none"),
    presenceActivityText: String(r.presence_activity_text ?? ""),
    runRequestedAt: r.run_requested_at ? new Date(r.run_requested_at).getTime() : 0,
  };
}

export async function getReportChannels(): Promise<ReportEntry[]> {
  const { rows } = await getPool().query(
    "select channel_id, user_id, name from report_channel order by created_at asc",
  );
  return rows.map((r) => ({
    channelId: String(r.channel_id),
    userId: r.user_id == null ? null : String(r.user_id),
    name: r.name == null ? "" : String(r.name),
  }));
}

// ── Status the bot writes back for the website to display ────────────────────

export async function heartbeat(state: string, botTag: string | null): Promise<void> {
  await getPool().query(
    `insert into bot_status (id, state, bot_tag, last_heartbeat_at)
     values ('singleton', $1, $2, now())
     on conflict (id) do update
       set state = $1, bot_tag = $2, last_heartbeat_at = now(), updated_at = now()`,
    [state, botTag],
  );
}

export async function recordError(message: string): Promise<void> {
  await getPool().query(
    `insert into bot_status (id, state, last_error, last_error_at, last_heartbeat_at)
     values ('singleton', 'error', $1, now(), now())
     on conflict (id) do update
       set state = 'error', last_error = $1, last_error_at = now(),
           last_heartbeat_at = now(), updated_at = now()`,
    [message.slice(0, 1000)],
  );
}

export async function recordReport(): Promise<void> {
  await getPool().query(
    `insert into bot_status (id, last_report_at, last_heartbeat_at)
     values ('singleton', now(), now())
     on conflict (id) do update
       set last_report_at = now(), last_heartbeat_at = now(), updated_at = now()`,
  );
}

export async function getLastReportAt(): Promise<number> {
  const { rows } = await getPool().query(
    "select last_report_at from bot_status where id = 'singleton'",
  );
  const v = rows[0]?.last_report_at;
  return v ? new Date(v).getTime() : 0;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

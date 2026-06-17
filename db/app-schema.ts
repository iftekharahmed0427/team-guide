import {
  pgTable,
  text,
  timestamp,
  date,
  unique,
  integer,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Pre-authorized members (the invite / allow list). A user row in auth-schema is
// only created when an invited person logs in with Discord for the first time.
export const invite = pgTable("invite", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("member"),
  invitedBy: text("invited_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// News posts authored from the dashboard (admin only).
export const newsPost = pgTable("news_post", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  tags: text("tags").array().notNull().default([]),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Guides: long-form how-tos authored like news (TipTap HTML), admin only, but
// organized by game so the listing reads like a per-game blog. `game` holds the
// category label (one of the curated values in app/(app)/guides/games.ts).
export const guide = pgTable("guide", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  game: text("game").notNull(),
  tags: text("tags").array().notNull().default([]),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// A shared team kanban board. Each task sits in one column (`status`) and is
// ordered within it by `position` (fractional, so moving a card only updates
// that single row instead of reindexing the whole column).
export const boardTask = pgTable("board_task", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").notNull().default("todo"),
  position: doublePrecision("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// A comment on a board card. Any signed-in member can post; deletable by the
// author or an admin (mirrors `note`). Author is denormalized for display.
export const boardTaskComment = pgTable("board_task_comment", {
  id: text("id").primaryKey(),
  taskId: text("task_id")
    .notNull()
    .references(() => boardTask.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Which members are assigned to a card. Admin-managed. A card can have several
// assignees and a member several cards, so this is a join table (unique pair).
// The display name is read live by joining the user table.
export const boardTaskAssignee = pgTable(
  "board_task_assignee",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => boardTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("board_task_assignee_unique").on(t.taskId, t.userId)],
);

// Free-form team notes. Anyone signed in can post; everyone sees them with the
// author's name. Deletable by the author or an admin.
export const note = pgTable("note", {
  id: text("id").primaryKey(),
  body: text("body").notNull(),
  authorId: text("author_id"),
  authorName: text("author_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A member marks a single day they are unavailable. Visible to all members.
export const unavailability = pgTable(
  "unavailability",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("unavailability_user_date").on(t.userId, t.date)],
);

// A shift check-in. An active (current) shift has checkedOutAt = null.
export const shift = pgTable("shift", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  checkedInAt: timestamp("checked_in_at").defaultNow().notNull(),
  checkedOutAt: timestamp("checked_out_at"),
});

// ── Reports bot config (edited from the website, read by the Discord bot) ─────

// One member's report channel. `userId`/`name` are the member's Discord
// snowflake and display name; `userId` null means count everyone's uploads in
// the channel. The bot reads these rows to know which channels to count + post.
//
// The live counter fields are maintained by the bot for the dashboard: it counts
// image attachments incrementally (only fetching messages newer than
// `lastSeenMessageId`) so it can refresh every few seconds without re-walking
// channel history and tripping Discord rate limits. `currentCount` is this
// channel's tally for the in-progress period; `previousCount` is its final tally
// for the period that just ended (kept so the dashboard delta survives a rollover).
export const reportChannel = pgTable(
  "report_channel",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    userId: text("user_id"), // Discord snowflake; null = count all uploads
    name: text("name").notNull().default(""),
    lastSeenMessageId: text("last_seen_message_id"), // newest message already counted
    currentCount: integer("current_count").notNull().default(0),
    previousCount: integer("previous_count").notNull().default(0),
    countedAt: timestamp("counted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("report_channel_channel_unique").on(t.channelId)],
);

// Single-row (`id` = "singleton") live ticket totals the bot keeps fresh for the
// dashboard "Tickets solved" card. `total` is the team-wide sum of image-attachment
// tickets in the in-progress period; `previousTotal` is the prior period's final
// sum (for the "% vs last period" delta). `periodStart` is the UTC start of the
// period the counts cover; when the bot sees a new period start it snapshots the
// totals into the `previous*` fields and resets, so the dashboard rolls over too.
export const ticketCount = pgTable("ticket_count", {
  id: text("id").primaryKey().default("singleton"),
  total: integer("total").notNull().default(0),
  previousTotal: integer("previous_total").notNull().default(0),
  periodStart: timestamp("period_start"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Single-row (`id` = "singleton") bot config, edited from the website Settings →
// Discord bot page and read by the bot. All times are UTC. `periodAnchor` is a
// Friday a 14-day period ends on. `token` is the Discord bot token (set-only via
// the UI, never sent back to the browser). Presence fields drive the bot's
// Discord status. `runRequestedAt` is bumped by the "Run now" button.
export const botSetting = pgTable("bot_setting", {
  id: text("id").primaryKey().default("singleton"),
  token: text("token"),
  enabled: boolean("enabled").notNull().default(true),
  periodAnchor: text("period_anchor").notNull().default("2026-06-26"),
  periodDays: integer("period_days").notNull().default(14),
  postHour: integer("post_hour").notNull().default(17),
  postMinute: integer("post_minute").notNull().default(0),
  presenceStatus: text("presence_status").notNull().default("online"), // online|idle|dnd|invisible
  presenceActivityType: text("presence_activity_type").notNull().default("none"), // none|Playing|Watching|Listening|Competing|Custom
  presenceActivityText: text("presence_activity_text").notNull().default(""),
  runRequestedAt: timestamp("run_requested_at"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Single-row health/state written by the bot, read by the website. The bot
// refreshes `lastHeartbeatAt` on a timer; the website shows online when it is
// recent. Errors and last report time are surfaced for visibility.
export const botStatus = pgTable("bot_status", {
  id: text("id").primaryKey().default("singleton"),
  state: text("state").notNull().default("offline"), // offline|online|error|no_token
  botTag: text("bot_tag"),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  lastHeartbeatAt: timestamp("last_heartbeat_at"),
  lastReportAt: timestamp("last_report_at"),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

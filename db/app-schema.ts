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

// The admin-managed list of games that guides can be filed under (the editor's
// category picker and the order sections appear on the guides index). Seeded
// with a default set the first time the list is read; admins add more from the
// guide editor. `position` orders the list (append new games at the end).
export const gameCategory = pgTable("game_category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  position: doublePrecision("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
// The live counter fields are maintained by the bot for the dashboard. The bot
// re-counts each channel's in-progress window every few seconds (cheap because
// counting starts after the most recent bot message in the channel), so deleted
// screenshots drop out of the tally on their own. `currentCount` is this
// channel's tally for the in-progress period; `previousCount` is its final tally
// for the period that just ended (kept so the dashboard delta survives a
// rollover). `countResetAt`, set by the per-channel "Reset" button, is a floor on
// the counting window so an admin can zero a channel mid-period.
// (`lastSeenMessageId` is retained from the old incremental counter and no longer
// read; left in place to avoid a destructive migration.)
export const reportChannel = pgTable(
  "report_channel",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id").notNull(),
    userId: text("user_id"), // Discord snowflake; null = count all uploads
    name: text("name").notNull().default(""),
    lastSeenMessageId: text("last_seen_message_id"), // legacy; unused
    currentCount: integer("current_count").notNull().default(0),
    previousCount: integer("previous_count").notNull().default(0),
    countResetAt: timestamp("count_reset_at"), // manual reset floor for counting
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

// An archived reporting period. A snapshot of every channel's standing is taken
// when an admin runs "Reset all" (the manual period-closing action): one
// `report_period` row plus a `report_period_entry` per member. `startedAt` is
// when the period began (the previous reset's end, null for the first ever);
// `endedAt` is the reset moment. Admins view these in /reports/history and can
// delete a period (cascades to its entries).
export const reportPeriod = pgTable("report_period", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at").defaultNow().notNull(),
  total: integer("total").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One member's final count within an archived period (name/userId denormalized,
// so the row is a stable snapshot even if the channel is later edited or removed).
export const reportPeriodEntry = pgTable("report_period_entry", {
  id: text("id").primaryKey(),
  periodId: text("period_id")
    .notNull()
    .references(() => reportPeriod.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  userId: text("user_id"),
  count: integer("count").notNull().default(0),
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
  // When true (default), the live counts reset automatically at each period
  // boundary. Turn off to keep counts accumulating until an admin resets a
  // channel manually (the per-channel / "Reset all" buttons).
  autoReset: boolean("auto_reset").notNull().default(true),
  // Period-end leaderboard announcement: posted to `announcementChannelId` when a
  // report runs (if `announcementEnabled`). The ranked member list is generated;
  // the title/color/intro/footer are the admin-customizable styling.
  announcementChannelId: text("announcement_channel_id"),
  announcementEnabled: boolean("announcement_enabled").notNull().default(false),
  announcementTitle: text("announcement_title").notNull().default("Ticket count for this period"),
  announcementColor: text("announcement_color").notNull().default("#5865f2"),
  announcementIntro: text("announcement_intro").notNull().default(""),
  announcementFooter: text("announcement_footer").notNull().default("Team Guide"),
  // Optional role ping posted as message content ABOVE the embed (mentions inside
  // an embed never notify). `announcementRoleId` is the role snowflake (null = no
  // ping); `announcementPingText` is the line, where `{role}` marks where the
  // <@&id> mention goes (prepended if the placeholder is absent).
  announcementRoleId: text("announcement_role_id"),
  announcementPingText: text("announcement_ping_text").notNull().default(""),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// A commission a team member submits for admin review. The member fills in the
// ticket name + customer email; an admin later sets the renewal date, product
// price ($) and commission rate (%), then approves or denies it. The payout
// (price * rate / 100) is computed on read, not stored. The submitter sees only
// their own commissions and, once decided, whether it was approved/denied and
// the amount they will receive. Admins see all and can edit any later.
export const commission = pgTable("commission", {
  id: text("id").primaryKey(),
  ticketName: text("ticket_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | denied
  // Admin review fields (null / default until reviewed):
  renewalDate: date("renewal_date", { mode: "string" }),
  productPrice: doublePrecision("product_price"), // US dollars
  commissionRate: doublePrecision("commission_rate").notNull().default(15), // percent
  reviewNote: text("review_note").notNull().default(""), // admin note shown to the submitter (e.g. a denial reason)
  // Submitter, denormalized like the other content tables (no FK).
  submittedById: text("submitted_by_id"),
  submittedByName: text("submitted_by_name").notNull().default(""),
  // Reviewer (admin) for visibility.
  reviewedByName: text("reviewed_by_name").notNull().default(""),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

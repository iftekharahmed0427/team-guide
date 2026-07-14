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

// Which games each team member specializes in (the /specialties matrix). Admins
// assign games to members so the team knows who to reach out to for a given
// game; `level` ranks a member as the go-to ("primary") or the fallback
// ("backup") for that game. Join table: one row per member-game pair (unique),
// both sides FK'd with cascade so removing a member or a game cleans up.
export const memberGame = pgTable(
  "member_game",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: text("game_id")
      .notNull()
      .references(() => gameCategory.id, { onDelete: "cascade" }),
    level: text("level").notNull().default("primary"), // primary | backup
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique("member_game_unique").on(t.userId, t.gameId)],
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

// An audit row written every time an admin resets ticket counts: a single
// channel ("Reset", scope 'channel') or all of them ("Reset all", scope 'all').
// Actor + names are denormalized (no FK, like the other content tables) so the
// trail survives even if the user, channel, or archived period is later removed.
// `periodId` links a "Reset all" to the report_period it archived (null for a
// single-channel reset or a no-op reset that archived nothing). Shown on
// /reports/history.
export const resetLog = pgTable("reset_log", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(), // 'all' | 'channel'
  channelName: text("channel_name"), // null for scope 'all'
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull().default(""),
  periodId: text("period_id"), // archived report_period a "Reset all" created, or null
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A manually logged Trustpilot/Google review: an admin uploads the screenshot
// (stored as a data URL like news/guides images) and it counts as one for its
// `source` in the current period. `periodId` is null while it is in the live
// period; "Reset all" stamps the current reviews with the report_period it
// archives, so reviews share the same period boundaries as the ticket counts.
export const review = pgTable("review", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // review_source id (seeds: 'trustpilot' | 'google')
  imageUrl: text("image_url").notNull(), // screenshot data URL
  note: text("note").notNull().default(""),
  addedById: text("added_by_id"),
  addedByName: text("added_by_name").notNull().default(""),
  periodId: text("period_id").references(() => reportPeriod.id, { onDelete: "cascade" }), // null = current period
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Single-row (`id` = "singleton") config for the review bonus: when the team's
// total reviews this period reaches `threshold` OR MORE, every member marked
// eligible (see review_bonus_member) earns a flat `amount` USD bonus on their
// /payments Amount. Both editable inline on /reviews by admins; seeded on first
// read (see lib/reviews.ts).
export const reviewSetting = pgTable("review_setting", {
  id: text("id").primaryKey().default("singleton"),
  threshold: integer("threshold").notNull().default(50), // team total reviews required
  amount: doublePrecision("amount").notNull().default(50), // $ per eligible member
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Members (non-admins) an admin has ticked as eligible for the review bonus on
// /reviews. A row's presence = eligible; toggling the checkbox inserts/deletes
// it. The bonus only pays out when the period's total reviews meet the threshold.
export const reviewBonusMember = pgTable("review_bonus_member", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin-managed catalog of review sources (Trustpilot, Google, ...) shown in the
// /reviews form's Source picker and managed at /settings/review-sources. Seeded
// with Trustpilot + Google on first read. `review.source` stores the source id;
// the seed ids ARE the legacy "trustpilot"/"google" keys, so existing reviews
// keep working with no data migration, and renaming a source updates its label
// everywhere without touching stored reviews. `sortOrder` controls display order.
export const reviewSource = pgTable("review_source", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Single-row (`id` = "singleton") bot config, edited from the website Settings →
// Discord bot page and read by the bot. `token` is the Discord bot token
// (set-only via the UI, never sent back to the browser). Presence fields drive
// the bot's Discord status. `runRequestedAt` is bumped by the "Run now" button
// and by "Reset all", the only ways the bot posts (there is no scheduled or
// automatic posting). `periodDays` is the report range-label / averages window.
//
// DORMANT (retained to avoid a destructive migration, no longer read or written;
// same pattern as report_channel.lastSeenMessageId): `enabled`, `autoReset`
// (auto-reset removed), `periodAnchor`, `postHour`, `postMinute` (scheduled
// posting removed).
export const botSetting = pgTable("bot_setting", {
  id: text("id").primaryKey().default("singleton"),
  token: text("token"),
  enabled: boolean("enabled").notNull().default(true), // dormant
  periodAnchor: text("period_anchor").notNull().default("2026-06-26"), // dormant
  periodDays: integer("period_days").notNull().default(14),
  postHour: integer("post_hour").notNull().default(17), // dormant
  postMinute: integer("post_minute").notNull().default(0), // dormant
  presenceStatus: text("presence_status").notNull().default("online"), // online|idle|dnd|invisible
  presenceActivityType: text("presence_activity_type").notNull().default("none"), // none|Playing|Watching|Listening|Competing|Custom
  presenceActivityText: text("presence_activity_text").notNull().default(""),
  runRequestedAt: timestamp("run_requested_at"),
  // "Reset all" sets this true after it archives + zeroes the counts. The bot
  // sees it on its next poll, posts the just-closed period's report to each
  // member channel + the announcement channel (reading the archived period, since
  // the live counts are already zeroed), then clears it back to false.
  resetAfterRun: boolean("reset_after_run").notNull().default(false),
  autoReset: boolean("auto_reset").notNull().default(true), // dormant (auto-reset removed)
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
  // Commissions share the report period (like reviews + disputes): null while the
  // commission is in the live period, stamped with the archived report_period on
  // "Reset all" so each pay period's commission payouts start fresh in /payments.
  periodId: text("period_id").references(() => reportPeriod.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// DORMANT (retained to avoid a destructive migration; the payments tool was
// reworked to a ticket-based payout and no longer uses this table). Was a manual
// payment ledger row. Left in place like the other retired schema (e.g.
// report_channel.lastSeenMessageId, bot_setting's dormant fields).
export const payment = pgTable("payment", {
  id: text("id").primaryKey(),
  memberId: text("member_id"),
  memberName: text("member_name").notNull().default(""),
  type: text("type").notNull().default("commission"),
  amount: doublePrecision("amount").notNull().default(0),
  status: text("status").notNull().default("owed"),
  method: text("method").notNull().default(""),
  periodLabel: text("period_label").notNull().default(""),
  paidAt: date("paid_at", { mode: "string" }),
  reference: text("reference").notNull().default(""),
  note: text("note").notNull().default(""),
  commissionId: text("commission_id"),
  createdById: text("created_by_id"),
  createdByName: text("created_by_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Per-member current payout settings for /payments. The ticket payout is derived
// live from the Reports counts ($1 each, see lib/payments.ts); this table stores
// the admin's per-member overrides on top: the eligible/ineligible toggle plus
// the manual amounts (base pay, bonus, commission, reimbursement), PayPal, and a
// note. One row per user; no row means eligible with no manual amounts. (Manual
// values persist until changed; the period-history feature will snapshot them.)
export const paymentEligibility = pgTable("payment_eligibility", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  eligible: boolean("eligible").notNull().default(true),
  baseCompensation: doublePrecision("base_compensation").notNull().default(0),
  bonusAmount: doublePrecision("bonus_amount").notNull().default(0),
  commission: doublePrecision("commission").notNull().default(0),
  reimbursement: doublePrecision("reimbursement").notNull().default(0),
  paypalEmail: text("paypal_email").notNull().default(""),
  note: text("note").notNull().default(""),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Catalog of payment roles (Tickets, Discord Manager, Backend, Disputes,
// Management) shown in the /payments Role column and managed by admins at
// /settings/payment-roles. `sortOrder` controls display order.
export const paymentRole = pgTable("payment_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Whether members in this role are paid per ticket (the "Tickets" group) vs a
  // flat base only. Drives the /payments Amount: paid-per-ticket roles earn
  // ticket pay + base; other roles earn base only.
  paidPerTicket: boolean("paid_per_ticket").notNull().default(false),
  // Whether members in this role get the Recovered revenue field (the "Disputes"
  // group). Recorded only, not paid. (Bonus itself is available to every member.)
  // Column name kept as bonus_eligible to avoid a rename migration.
  bonusEligible: boolean("bonus_eligible").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-member overrides for the rebuilt /payments sheet. One row per user; no row
// means no overrides. `ticketOverride` (null = track the live Reports count) holds
// a fixed admin count that takes precedence over the live count; `roleId` is the
// member's assigned payment role (null = unassigned).
export const paymentOverride = pgTable("payment_override", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  ticketOverride: integer("ticket_override"), // null = track the live Reports count
  roleId: text("role_id").references(() => paymentRole.id, { onDelete: "set null" }),
  baseCompensation: doublePrecision("base_compensation").notNull().default(0), // flat $ on top of ticket pay
  bonus: doublePrecision("bonus").notNull().default(0), // manual $ bonus (bonus-eligible roles); adds to Amount
  commissionOverride: doublePrecision("commission_override"), // null = track the computed approved-commission total
  adjustment: doublePrecision("adjustment").notNull().default(0), // signed +/- correction folded into Amount
  hidden: boolean("hidden").notNull().default(false), // excluded from the /payments list (admin can unhide)
  recoveredRevenue: doublePrecision("recovered_revenue").notNull().default(0), // recorded only, not paid
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// A historical pay period for /payments/history: either hand-entered to back-fill
// old data, or auto-snapshotted when an admin runs "Reset all". Each period owns
// its rows (payment_period_row); the full payments table is rebuilt from them, so
// it never depends on members or roles that no longer exist. `ticketRate` is the
// $/ticket for that period (today's is $1, but old ones may differ).
export const paymentPeriod = pgTable("payment_period", {
  id: text("id").primaryKey(),
  label: text("label").notNull().default(""),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  ticketRate: doublePrecision("ticket_rate").notNull().default(1),
  source: text("source").notNull().default("manual"), // manual | reset
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// One member's row within a historical pay period, mirroring the live payments
// columns. `memberName` is the snapshot label (free text, so departed members are
// fine); `memberId` links to a current user only so their avatar can show (null =
// letter avatar). `paidPerTicket` is stored so the amount math is self-contained.
// Amount is computed on read: (paidPerTicket ? tickets * period.ticketRate : 0) +
// base + bonus + commission, unless `amountOverride` is set.
export const paymentPeriodRow = pgTable("payment_period_row", {
  id: text("id").primaryKey(),
  periodId: text("period_id")
    .notNull()
    .references(() => paymentPeriod.id, { onDelete: "cascade" }),
  memberId: text("member_id"), // current user id for the avatar; null = letter avatar
  memberName: text("member_name").notNull().default(""),
  roleName: text("role_name").notNull().default(""),
  paidPerTicket: boolean("paid_per_ticket").notNull().default(true),
  tickets: integer("tickets").notNull().default(0),
  baseCompensation: doublePrecision("base_compensation").notNull().default(0),
  bonus: doublePrecision("bonus").notNull().default(0),
  commission: doublePrecision("commission").notNull().default(0),
  adjustment: doublePrecision("adjustment").notNull().default(0), // signed +/- correction
  amountOverride: doublePrecision("amount_override"), // null = use the computed amount
  position: doublePrecision("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A compensation period for the team payout sheet (/payments). Biweekly,
// numbered, with a date-range label. Auto-created from the Reports cycle but
// every field is editable. `reviewBonus*` capture the period-level Trust Pilot /
// Reviews bonus (whether it applies, the flat amount, and the review count).
// `finalized` snapshots the period so its ticket counts stop tracking Reports.
export const compPeriod = pgTable("comp_period", {
  id: text("id").primaryKey(),
  number: integer("number"), // period number (nullable; auto = last + 1)
  label: text("label").notNull().default(""), // e.g. "Feb 27-Mar 12"
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  reviewBonusLabel: text("review_bonus_label").notNull().default("Trust Pilot Bonus"),
  reviewBonusEnabled: boolean("review_bonus_enabled").notNull().default(false),
  reviewBonusAmount: doublePrecision("review_bonus_amount").notNull().default(50),
  reviewCount: integer("review_count").notNull().default(0),
  finalized: boolean("finalized").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// One member's line on a compensation period. Covers both ticket members (role
// "Tickets", paid tickets * ticketRate + bonus + commission) and role members
// (a fixed baseCompensation + commission). Member is denormalized (no FK) so the
// historical sheet stays stable; `memberId` links to a user when one matches.
// Total is computed on read: tickets*rate + base + bonus + commission +
// reimbursement (recoveredRevenue is the informational basis for commission, not
// added). `bonusIncluded` is the per-member Yes/No for the period review bonus.
export const compEntry = pgTable("comp_entry", {
  id: text("id").primaryKey(),
  periodId: text("period_id")
    .notNull()
    .references(() => compPeriod.id, { onDelete: "cascade" }),
  memberId: text("member_id"),
  memberName: text("member_name").notNull().default(""),
  role: text("role").notNull().default("Tickets"),
  tickets: integer("tickets").notNull().default(0),
  ticketRate: doublePrecision("ticket_rate").notNull().default(1), // USD per ticket
  baseCompensation: doublePrecision("base_compensation").notNull().default(0),
  bonusIncluded: boolean("bonus_included").notNull().default(false),
  bonusAmount: doublePrecision("bonus_amount").notNull().default(0),
  commission: doublePrecision("commission").notNull().default(0),
  recoveredRevenue: doublePrecision("recovered_revenue").notNull().default(0),
  reimbursement: doublePrecision("reimbursement").notNull().default(0),
  paypalEmail: text("paypal_email").notNull().default(""),
  note: text("note").notNull().default(""),
  position: doublePrecision("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// ── Support ticket QA audits ──────────────────────────────────────────────────

// One QA review of a support ticket against the scorecard rubric (the criteria
// live in app/(app)/audits/criteria.ts). An admin fills it out for a team
// member's ticket; that member can see their own. `memberId`/`reviewerId` are
// denormalized user ids (no FK, like the content tables' authorId).
// `totalScore`/`possibleScore` are computed + stored; `possibleScore` excludes
// any criterion marked N/A, and percentage = total / possible.
export const audit = pgTable("audit", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().default(""),
  ticketType: text("ticket_type").notNull().default(""),
  ticketDate: date("ticket_date", { mode: "string" }), // the ticket's date, optional
  memberId: text("member_id"), // the audited agent's user id
  memberName: text("member_name").notNull().default(""),
  reviewerId: text("reviewer_id"), // the admin who reviewed
  reviewerName: text("reviewer_name").notNull().default(""),
  totalScore: integer("total_score").notNull().default(0),
  possibleScore: integer("possible_score").notNull().default(0),
  summary: text("summary").notNull().default(""), // optional overall feedback
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// One criterion's result within an audit. `criterionKey` matches AUDIT_CRITERIA;
// `na` excludes the criterion from the totals, otherwise `score` is 0..maxPoints.
export const auditScore = pgTable("audit_score", {
  id: text("id").primaryKey(),
  auditId: text("audit_id")
    .notNull()
    .references(() => audit.id, { onDelete: "cascade" }),
  criterionKey: text("criterion_key").notNull(),
  na: boolean("na").notNull().default(false),
  score: integer("score").notNull().default(0),
  comment: text("comment").notNull().default(""),
});

// A screenshot attached to an audit (evidence of the ticket). Stored like the
// review screenshots: a private-bucket object key, or an inline data URL when
// storage is not configured (see lib/storage.ts).
export const auditScreenshot = pgTable("audit_screenshot", {
  id: text("id").primaryKey(),
  auditId: text("audit_id")
    .notNull()
    .references(() => audit.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Portal-wide activity log: one row per meaningful action (and sign-in), written
// by lib/activity.ts logActivity() next to each action's notifyChange(). Actor is
// denormalized (no FK). `action` is a stable key like "audit.created"; the page
// (/settings/activity, admin only) maps it to a friendly phrase. `targetLabel` is
// the human label of the affected thing (ticket #, post title, channel name).
export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull().default(""),
  action: text("action").notNull(),
  targetLabel: text("target_label").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Disputes ──────────────────────────────────────────────────────────────────

// Admin-managed catalog of dispute categories shown in the /disputes form's
// Category picker (seeded with "Fraudulent" the first time it is read). Mirrors
// the payment_role / game_category catalogs; `sortOrder` controls display order.
export const disputeCategory = pgTable("dispute_category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A payment dispute logged by a Disputes-role member (or an admin): a free-text
// reference, a category (denormalized label, like guide.game), an outcome
// (won/lost/refunded), the disputed amount in USD, and a screenshot (private-bucket
// object key, or an inline data URL when storage is off, like reviews/audits).
// Submitter is denormalized (no FK). Only WON disputes count: 5% of each member's
// current-period won amounts is added to their /payments bonus (see lib/disputes +
// lib/payments). Disputes share the report period: `periodId` is null while
// current; "Reset all" stamps them with the archived period (like reviews), so the
// recovered total and the 5% bonus reset each period.
export const dispute = pgTable("dispute", {
  id: text("id").primaryKey(),
  dispute: text("dispute").notNull().default(""), // free-text dispute reference / detail
  category: text("category").notNull().default(""),
  outcome: text("outcome").notNull().default("won"), // 'won' | 'lost' | 'refunded'; only won earns the bonus
  amount: doublePrecision("amount").notNull().default(0), // USD disputed / recovered
  imageUrl: text("image_url").notNull(), // screenshot object key or data URL
  submittedById: text("submitted_by_id"),
  submittedByName: text("submitted_by_name").notNull().default(""),
  periodId: text("period_id").references(() => reportPeriod.id, { onDelete: "cascade" }), // null = current period
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

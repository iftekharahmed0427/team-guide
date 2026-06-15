import {
  pgTable,
  text,
  timestamp,
  date,
  unique,
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

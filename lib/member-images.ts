import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { account, user as userTable } from "@/db/auth-schema";

// Avatars for a set of members, in one query.
//
// Several tools store who did something as an id plus a denormalized name
// (audits, commissions, archived report periods), which is what keeps the
// history readable after someone leaves. The avatar is deliberately NOT
// denormalized with them: it changes whenever the member changes their Discord
// picture, so it is read live and the row keeps only the id.
//
// Rows recorded against a name with no account simply have no id and get no
// picture, which is the same as a member who has not set one: Avatar falls back
// to their initials either way.

export async function imagesByUserId(
  ids: (string | null | undefined)[],
): Promise<Map<string, string | null>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();

  const rows = await db
    .select({ id: userTable.id, image: userTable.image })
    .from(userTable)
    .where(inArray(userTable.id, wanted));

  return new Map(rows.map((r) => [r.id, r.image ?? null]));
}

/**
 * The same, for tables that identify a member by their Discord snowflake rather
 * than by our user id: the report channels and the archived period entries both
 * store what the bot sees, so they reach the user row through the linked
 * account.
 */
export async function imagesByDiscordId(
  discordIds: (string | null | undefined)[],
): Promise<Map<string, string | null>> {
  const wanted = [...new Set(discordIds.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return new Map();

  const rows = await db
    .select({ discordId: account.accountId, image: userTable.image })
    .from(account)
    .innerJoin(userTable, eq(userTable.id, account.userId))
    .where(
      and(eq(account.providerId, "discord"), inArray(account.accountId, wanted)),
    );

  return new Map(rows.map((r) => [r.discordId, r.image ?? null]));
}

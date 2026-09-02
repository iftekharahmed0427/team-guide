import type { Client } from "discord.js";
import { getLinkedMembers, updateMemberProfile } from "./db.ts";

// Keeps each member's name and avatar in step with their Discord account.
//
// The website writes both once, when the member signs in, and never again. A
// Discord avatar URL is pinned to the avatar hash, so the moment someone
// changes their picture the stored URL points at something that no longer
// exists and the portal renders a broken image. Names drift the same way.
//
// The bot is the right place for this: it is already logged in and already
// ticking, so no member has to sign in for the rest of the team to see them
// correctly. Fetching a user by id is a plain REST call and needs no privileged
// intent, unlike reading the guild's member list.

// Hourly. Avatars change rarely and this writes only what actually differs, so
// the usual pass is a handful of REST calls and no database writes at all.
export const PROFILE_SYNC_MS = 60 * 60 * 1000;

/**
 * The avatar URL for a Discord user, built the way Better Auth builds it at
 * sign-in so the two writers cannot disagree about the same account.
 *
 * Animated avatars carry an `a_` hash and are served as .gif; a member with no
 * avatar gets the shared default for their account, which never 404s.
 */
export function avatarUrl(
  id: string,
  avatar: string | null,
  discriminator: string,
): string {
  if (!avatar) {
    // Post-migration usernames have discriminator "0" and index by snowflake;
    // legacy tagged accounts still index by their four digits.
    const index =
      discriminator && discriminator !== "0"
        ? Number(discriminator) % 5
        : Number((BigInt(id) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const format = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${format}`;
}

/** Display name first, falling back to the username, as Better Auth does. */
export const displayName = (globalName: string | null, username: string) =>
  globalName || username || "";

export async function syncProfiles(client: Client): Promise<number> {
  const members = await getLinkedMembers();
  let updated = 0;

  for (const member of members) {
    try {
      // force: true skips discord.js's cache, which is the whole point here:
      // a cached user would hand back the same stale avatar hash every pass.
      const user = await client.users.fetch(member.discordId, { force: true });
      const name = displayName(user.globalName, user.username);
      const image = avatarUrl(user.id, user.avatar, user.discriminator);

      if (name === member.name && image === member.image) continue;
      await updateMemberProfile(member.userId, name, image);
      updated += 1;
    } catch (e) {
      // One member failing (left Discord, deleted account, a blip) must not
      // stop the rest of the pass.
      console.error(
        `[bot] profile sync failed for ${member.discordId}:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  return updated;
}

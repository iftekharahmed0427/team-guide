"use server";

import { getSession } from "@/lib/auth";
import { getNode, getServer, getUser, PteroError } from "@/lib/ptero";
import type { LookupNode, LookupServer, LookupUser } from "@/lib/tools-constants";

// Read-only lookups against the game panel. Every signed-in team member can run
// them; nothing here writes, so there is no revalidate/notify step and no
// activity-log entry.

const DIGITS = /^\d+$/;

async function requireMember() {
  const session = await getSession();
  if (!session) throw new PteroError("You must be signed in to use the panel tools.");
  return session;
}

// Anything the panel client raises is safe to show; anything else is a bug and
// gets a generic message (the real error still lands in the server logs).
function toMessage(err: unknown): string {
  if (err instanceof PteroError) return err.message;
  console.error("Panel lookup failed:", err);
  return "Something went wrong talking to the panel.";
}

export async function lookupServer(
  internalId: string,
): Promise<{ server: LookupServer } | { error: string }> {
  try {
    await requireMember();
    const id = internalId.trim();
    if (!DIGITS.test(id)) return { error: "Enter the numeric internal server ID." };
    return { server: await getServer(id) };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function lookupUser(input: {
  username: string;
  email: string;
}): Promise<{ user: LookupUser | null } | { error: string }> {
  try {
    await requireMember();
    const username = input.username.trim().slice(0, 200);
    const email = input.email.trim().slice(0, 200);
    if (!username && !email) return { error: "Enter a username or an email." };
    return { user: await getUser({ username, email }) };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

export async function lookupNode(
  nodeId: string,
): Promise<{ node: LookupNode } | { error: string }> {
  try {
    await requireMember();
    const id = nodeId.trim();
    if (!DIGITS.test(id)) return { error: "Enter the numeric node ID." };
    return { node: await getNode(id) };
  } catch (err) {
    return { error: toMessage(err) };
  }
}

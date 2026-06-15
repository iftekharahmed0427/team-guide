"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { invite as inviteTable } from "@/db/app-schema";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    throw new Error("Not authorized");
  }
  return session;
}

function normalizeRole(value: FormDataEntryValue | null): "admin" | "member" {
  return String(value) === "admin" ? "admin" : "member";
}

export async function inviteMember(formData: FormData) {
  const session = await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = normalizeRole(formData.get("role"));
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address");
  }
  await db
    .insert(inviteTable)
    .values({ id: randomUUID(), email, role, invitedBy: session.user.email })
    .onConflictDoUpdate({ target: inviteTable.email, set: { role } });
  revalidatePath("/team");
}

export async function setMemberRole(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = normalizeRole(formData.get("role"));
  if (!userId) throw new Error("Missing user");

  await db.update(userTable).set({ role }).where(eq(userTable.id, userId));

  const rows = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (rows[0]) {
    await db
      .update(inviteTable)
      .set({ role })
      .where(eq(inviteTable.email, rows[0].email.toLowerCase()));
  }
  revalidatePath("/team");
}

export async function removeMember(formData: FormData) {
  const session = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Missing user");
  if (userId === session.user.id) {
    throw new Error("You cannot remove yourself");
  }

  const rows = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  // Deleting the user cascades to their sessions and accounts.
  await db.delete(userTable).where(eq(userTable.id, userId));
  if (rows[0]) {
    await db
      .delete(inviteTable)
      .where(eq(inviteTable.email, rows[0].email.toLowerCase()));
  }
  revalidatePath("/team");
}

export async function revokeInvite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("inviteId") ?? "");
  if (!id) throw new Error("Missing invite");
  await db.delete(inviteTable).where(eq(inviteTable.id, id));
  revalidatePath("/team");
}

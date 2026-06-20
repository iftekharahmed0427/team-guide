"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { commission } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";
import { logActivity } from "@/lib/activity";

const PAGE = "/commissions";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Result = { ok: true } | { error: string };

async function requireMember() {
  const session = await getSession();
  if (!session) throw new Error("Not authorized");
  return session;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") throw new Error("Not authorized");
  return session;
}

// A team member submits a commission for review (status starts pending).
export async function submitCommission(input: {
  ticketName: string;
  customerEmail: string;
}): Promise<Result> {
  let session;
  try {
    session = await requireMember();
  } catch {
    return { error: "You must be signed in to submit a commission." };
  }
  const ticketName = input.ticketName.trim().slice(0, 200);
  const customerEmail = input.customerEmail.trim().slice(0, 200);
  if (!ticketName) return { error: "Ticket name is required." };
  if (!EMAIL.test(customerEmail)) return { error: "Enter a valid customer email." };

  await db.insert(commission).values({
    id: randomUUID(),
    ticketName,
    customerEmail,
    submittedById: session.user.id,
    submittedByName: session.user.name || session.user.email || "Member",
  });
  await logActivity("commission.submitted", ticketName);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

// An admin sets the figures and the decision. Also used to edit a commission
// later: re-saving with a decision recalculates the payout from the new figures.
export async function reviewCommission(input: {
  id: string;
  renewalDate: string | null;
  productPrice: number;
  commissionRate: number;
  decision: "approved" | "denied";
  note: string;
}): Promise<Result> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: "Only admins can review commissions." };
  }
  if (!input.id) return { error: "Missing commission." };
  if (input.decision !== "approved" && input.decision !== "denied") {
    return { error: "Choose approve or deny." };
  }
  const price = Number(input.productPrice);
  const rate = Number(input.commissionRate);
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid product price." };
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { error: "Commission rate must be between 0 and 100." };
  }
  const renewalDate = input.renewalDate?.trim() || null;
  if (renewalDate && Number.isNaN(Date.parse(renewalDate))) {
    return { error: "Enter a valid renewal date." };
  }

  await db
    .update(commission)
    .set({
      renewalDate,
      productPrice: price,
      commissionRate: rate,
      reviewNote: (input.note ?? "").trim().slice(0, 500),
      status: input.decision,
      reviewedByName: session.user.name || session.user.email || "Admin",
      reviewedAt: new Date(),
    })
    .where(eq(commission.id, input.id));
  await logActivity("commission.reviewed", input.decision);
  await notifyChange();
  revalidatePath(PAGE);
  return { ok: true };
}

// Admins can remove a commission (e.g. an accidental or duplicate submission).
export async function deleteCommission(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(commission).where(eq(commission.id, id));
  await logActivity("commission.deleted");
  await notifyChange();
  revalidatePath(PAGE);
}

"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { reportPeriod } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";

type Result = { ok: true } | { error: string };

// Delete an archived period (its entries cascade away with it). Admin only.
export async function deleteReportPeriod(id: string): Promise<Result> {
  const session = await getSession();
  if (session?.user.role !== "admin") return { error: "Only admins can delete periods." };
  if (!id) return { error: "Missing period." };
  await db.delete(reportPeriod).where(eq(reportPeriod.id, id));
  revalidatePath("/reports/history");
  await notifyChange();
  return { ok: true };
}

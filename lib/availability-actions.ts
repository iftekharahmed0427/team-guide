"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { unavailability } from "@/db/app-schema";
import { notifyChange } from "@/lib/notify";

// Any signed-in member can toggle their OWN unavailability for a given day.
export async function toggleUnavailability(date: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");

  const existing = await db
    .select({ id: unavailability.id })
    .from(unavailability)
    .where(
      and(
        eq(unavailability.userId, session.user.id),
        eq(unavailability.date, date),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(unavailability).where(eq(unavailability.id, existing[0].id));
  } else {
    await db.insert(unavailability).values({
      id: randomUUID(),
      userId: session.user.id,
      date,
    });
  }

  revalidatePath("/");
  await notifyChange();
}

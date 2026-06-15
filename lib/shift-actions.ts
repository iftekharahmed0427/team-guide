"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { shift } from "@/db/app-schema";

// Toggle the current member's shift: check in if off, check out if on.
export async function toggleShift() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");

  const active = await db
    .select({ id: shift.id })
    .from(shift)
    .where(and(eq(shift.userId, session.user.id), isNull(shift.checkedOutAt)))
    .limit(1);

  if (active.length > 0) {
    await db
      .update(shift)
      .set({ checkedOutAt: new Date() })
      .where(eq(shift.id, active[0].id));
  } else {
    await db.insert(shift).values({ id: randomUUID(), userId: session.user.id });
  }

  revalidatePath("/");
}

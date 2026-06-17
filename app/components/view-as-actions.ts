"use server";

import { cookies } from "next/headers";
import { getRealSession, VIEW_AS_COOKIE } from "@/lib/auth";

// Toggle the "view as member" preview. Only a real admin can turn it on; it only
// ever downgrades the admin's own view, so there is no privilege escalation.
export async function setViewAsMember(on: boolean): Promise<void> {
  const real = await getRealSession();
  if (real?.user.role !== "admin") return;

  const jar = await cookies();
  if (on) {
    jar.set(VIEW_AS_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
  } else {
    jar.delete(VIEW_AS_COOKIE);
  }
}

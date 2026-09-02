import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { plainName } from "../../member";
import AuditForm, { type Member } from "../audit-form";

// /audits/new - the scorecard form from the "new-audit-form" Figma frame
// (node 159:4). Opened by New audit on the grid.
//
// The member list is the real user table, the way the live /audits/new page
// builds it. Everything else lives in the client form, which the edit page
// shares.

export default async function NewAuditPage() {
  const members: Member[] = (
    await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(asc(user.name))
  ).map((m) => ({ id: m.id, name: plainName(m.name || m.email || "Member") }));

  return <AuditForm members={members} backHref="/audits" />;
}

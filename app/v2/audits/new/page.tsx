import { asc } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { plainName } from "../../member";
import V2AuditForm, { type Member } from "../audit-form";

// /v2/audits/new - the scorecard form from the "new-audit-form" Figma frame
// (node 159:4). Opened by New audit on the grid.
//
// The member list is the real user table, the way the live /audits/new page
// builds it. Everything else lives in the client form, which the edit page
// shares.

export default async function V2NewAuditPage() {
  const members: Member[] = (
    await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(asc(user.name))
  ).map((m) => ({ id: m.id, name: plainName(m.name || m.email || "Member") }));

  return <V2AuditForm members={members} backHref="/v2/audits" />;
}

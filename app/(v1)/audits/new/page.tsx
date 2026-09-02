import { redirect } from "next/navigation";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import AuditForm from "../audit-form";

// Admin-only: fill out the QA scorecard for a member's ticket.
export default async function NewAuditPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/audits");

  const members = (
    await db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .orderBy(asc(user.name))
  ).map((m) => ({ id: m.id, name: m.name || m.email || "Member" }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">New audit</h1>
          <p className="text-xs text-muted">Score a support ticket against the QA rubric</p>
        </div>
        <Link
          href="/audits"
          className="btn-wipe inline-flex h-9 items-center gap-2 border border-border px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} strokeWidth={1.75} />
          Back
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-3xl">
          <AuditForm members={members} />
        </div>
      </main>
    </>
  );
}

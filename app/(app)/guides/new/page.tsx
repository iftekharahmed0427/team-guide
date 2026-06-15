import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import GuidesEditor from "../guides-editor";

export default async function NewGuidePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/guides");

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Link
          href="/guides"
          className="flex h-9 items-center gap-2 border border-border bg-surface-2 px-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          Back to guides
        </Link>
        <div>
          <h1 className="text-base font-semibold tracking-tight">New guide</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto w-full max-w-3xl">
          <GuidesEditor />
        </div>
      </main>
    </>
  );
}

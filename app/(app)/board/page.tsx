import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import KanbanBoard from "./kanban-board";
import { listTasks } from "./actions";
import { displayName, type Member } from "./columns";

export default async function BoardPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id ?? null;

  const tasks = await listTasks();

  const memberRows = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .orderBy(asc(userTable.createdAt));
  const members: Member[] = memberRows.map((m) => ({
    id: m.id,
    name: displayName(m.name, m.email),
  }));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Board</h1>
          <p className="text-xs text-muted">Team kanban · drag cards to update status</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <KanbanBoard
          initialTasks={tasks}
          members={members}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
        />
      </main>
    </>
  );
}

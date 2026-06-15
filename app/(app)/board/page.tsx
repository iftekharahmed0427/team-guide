import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { boardTask } from "@/db/app-schema";
import KanbanBoard from "./kanban-board";
import { type Task } from "./columns";

export default async function BoardPage() {
  await getSession();

  const rows = await db.select().from(boardTask).orderBy(asc(boardTask.position));
  const tasks: Task[] = rows.map((t) => ({
    id: t.id,
    title: t.title,
    note: t.note,
    status: t.status,
    position: t.position,
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
        <KanbanBoard initialTasks={tasks} />
      </main>
    </>
  );
}

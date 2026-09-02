import { asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { listTasks } from "@/lib/actions/board";
import { displayName, type Member } from "@/lib/board-columns";
import BoardClient from "./board-client";

// /v2/board - the kanban board from the "kanban-board-page" Figma frame
// (node 43:4): three columns, each with a counted header, its cards and a
// quick-add row. Shell comes from app/v2/layout.tsx.
//
// Reads the real board through the live listTasks, which brings each card's
// assignees and comment count with it. The board is shared, so every signed-in
// member can add, move and delete cards; only assigning is admin-only.

export default async function V2BoardPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const [tasks, memberRows] = await Promise.all([
    listTasks(),
    db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .orderBy(asc(userTable.name)),
  ]);

  const members: Member[] = memberRows.map((m) => ({
    id: m.id,
    name: displayName(m.name, m.email),
    image: null,
  }));

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Board</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Team kanban · drag cards to update status
          </p>
        </div>
      </div>

      <BoardClient
        tasks={tasks}
        members={members}
        isAdmin={isAdmin}
        currentUserId={session?.user.id ?? ""}
      />
    </div>
  );
}

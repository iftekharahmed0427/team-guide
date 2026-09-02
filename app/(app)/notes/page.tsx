import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { note } from "@/db/app-schema";
import { user } from "@/db/auth-schema";
import { formatDateTime } from "@/lib/datetime";
import { plainName } from "../member";
import NoteComposer from "./note-composer";
import NotesBoard from "./notes-board";
import { countLabel, type Note } from "./notes-shape";

// /notes - the team's shared notes, and the one place a piece of team
// documentation can live without becoming a guide.
//
// No Figma frame draws this section, so it is composed from the v2 design
// system: the disputes log card for the composer, and the reviews evidence list
// for the notes themselves.
//
// The whole set is sent to the client in one go so search can filter as you
// type. That is affordable because a note is a row of text: the query below is
// the only one the page runs, and the bodies it returns are what the page would
// render anyway.
//
// Open to every member, which is the point - notes are how the team tells the
// team something. Only pinning is admin-only.

export default async function NotesPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id ?? "";

  const rows = await db
    .select({
      id: note.id,
      title: note.title,
      body: note.body,
      pinned: note.pinned,
      authorId: note.authorId,
      authorName: note.authorName,
      authorImage: user.image,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    })
    .from(note)
    .leftJoin(user, eq(note.authorId, user.id))
    // Pinned first, then newest, which is the order the list renders in and the
    // order it keeps while a search narrows it.
    .orderBy(desc(note.pinned), desc(note.createdAt));

  const notes: Note[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    authorId: r.authorId,
    authorName: plainName(r.authorName || "Member"),
    authorImage: r.authorImage ?? null,
    when: formatDateTime(r.createdAt),
    editedWhen: r.updatedAt ? formatDateTime(r.updatedAt) : null,
  }));

  const pinnedCount = notes.filter((n) => n.pinned).length;

  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Notes</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Shared with the whole team. Post a heads-up, write something down,
            or keep documentation everyone can search.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-[16px]">
          {pinnedCount > 0 ? (
            <p className="rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#8fb0a7]">
              {countLabel(pinnedCount, "pinned note")}
            </p>
          ) : null}
          <p className="rounded-[8px] border border-[#243033]! bg-[#171e24] px-[16px] py-[10px] text-[14px] font-semibold text-[#e2e8f0]">
            {countLabel(notes.length)}
          </p>
        </div>
      </div>

      <NoteComposer />

      <NotesBoard
        notes={notes}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  );
}

import { desc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { note } from "@/db/app-schema";
import { deleteNote } from "./actions";
import NoteComposer from "./note-composer";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatWhen(d: Date | string) {
  const x = new Date(d);
  let h = x.getHours();
  const m = x.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${SHORT_MONTHS[x.getMonth()]} ${x.getDate()} · ${h}:${String(m).padStart(2, "0")} ${ap}`;
}

function getInitials(name?: string | null) {
  const source = (name ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export default async function NotesPage() {
  const session = await getSession();
  const currentUserId = session?.user.id;
  const isAdmin = session?.user.role === "admin";

  const notes = await db.select().from(note).orderBy(desc(note.createdAt));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Notes</h1>
          <p className="text-xs text-muted">
            {notes.length} note{notes.length === 1 ? "" : "s"} · shared with the whole team
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-3xl flex-col gap-4">
          <NoteComposer />

          {notes.length === 0 ? (
            <div className="border border-border bg-surface p-10 text-center text-sm text-muted">
              No notes yet. Be the first to post one.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((n) => {
                const canDelete = isAdmin || n.authorId === currentUserId;
                return (
                  <div key={n.id} className="border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface-2 text-xs font-semibold">
                          {getInitials(n.authorName)}
                        </div>
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-foreground">
                            {n.authorName || "Member"}
                            {n.authorId === currentUserId ? (
                              <span className="text-muted"> (you)</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted">{formatWhen(n.createdAt)}</p>
                        </div>
                      </div>
                      {canDelete ? (
                        <form action={deleteNote}>
                          <input type="hidden" name="id" value={n.id} />
                          <button
                            type="submit"
                            aria-label="Delete note"
                            className="flex h-7 w-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                          >
                            <Trash2 size={14} strokeWidth={1.75} />
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {n.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

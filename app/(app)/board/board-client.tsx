"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Inbox, Plus, X } from "lucide-react";
import {
  createTask,
  deleteTask,
  moveTask,
} from "@/lib/actions/board";
import { COLUMNS, type Member, type Task } from "@/lib/board-columns";
import TaskModal from "./task-modal";

// The kanban board from the "kanban-board-page" frame (node 43:4), on the real
// board_task rows.
//
// Cards drag between and within columns, which is what the subtitle has always
// claimed. The move is applied locally first and then written, so a drag lands
// immediately instead of waiting on the round trip; a failure re-reads from the
// server and puts the card back.
//
// Every signed-in member can edit the board, so nothing here is admin-gated
// except assigning members, which the modal handles.

const EMPTY: Record<string, string> = {
  todo: "No tasks in backlog",
  in_progress: "Nothing in progress",
  done: "Nothing finished yet",
};

/** Sits a card between its neighbours, or on the end of the column. */
function positionFor(tasks: Task[], index: number): number {
  const before = tasks[index - 1]?.position;
  const after = tasks[index]?.position;
  if (before !== undefined && after !== undefined) return (before + after) / 2;
  if (after !== undefined) return after - 1000;
  if (before !== undefined) return before + 1000;
  return Date.now();
}

export default function BoardClient({
  tasks: initial,
  members,
  isAdmin,
  currentUserId,
}: {
  tasks: Task[];
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [dragging, setDragging] = useState<Task | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  // The server list wins whenever it changes, so a card added in another tab
  // shows up. Adjusting state during render rather than in an effect.
  const signature = initial
    .map((t) => `${t.id}:${t.status}:${t.position}:${t.commentCount}`)
    .join("|");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setTasks(initial);
  }

  const sensors = useSensors(
    // A small threshold so a click still opens the card rather than starting a
    // drag the moment the pointer moves.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const inColumn = (status: string) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    // Dropped on nothing, or back on itself: a short drag that ends where it
    // started is not a move, and treating it as one would send the card to the
    // end of its column and write a move nobody asked for.
    if (!over || over.id === active.id) return;

    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    // Dropped on a column, or on another card in one.
    const overTask = tasks.find((t) => t.id === over.id);
    const status = overTask ? overTask.status : String(over.id);
    if (!COLUMNS.some((c) => c.id === status)) return;

    const column = inColumn(status).filter((t) => t.id !== task.id);
    const index = overTask
      ? column.findIndex((t) => t.id === overTask.id)
      : column.length;
    const position = positionFor(column, index === -1 ? column.length : index);

    if (task.status === status && task.position === position) return;

    const previous = tasks;
    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status, position } : t)),
    );
    setError("");

    startTransition(async () => {
      try {
        await moveTask({ id: task.id, status, position });
      } catch {
        setTasks(previous);
        setError("That move did not save. The card has been put back.");
        return;
      }
      router.refresh();
    });
  }

  function add(status: string) {
    const title = draft.trim();
    if (!title) return;
    const id = crypto.randomUUID();
    setError("");
    setDraft("");
    setAdding(null);
    // Shown straight away, with the id the server is about to store.
    setTasks((current) => [
      ...current,
      {
        id,
        title,
        note: "",
        status,
        position: Date.now(),
        assignees: [],
        commentCount: 0,
      },
    ]);

    startTransition(async () => {
      const res = await createTask({ id, title, status });
      if ("error" in res) {
        setTasks((current) => current.filter((t) => t.id !== id));
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    const previous = tasks;
    setOpenId(null);
    setTasks((current) => current.filter((t) => t.id !== id));
    startTransition(async () => {
      try {
        await deleteTask(id);
      } catch {
        setTasks(previous);
        setError("That card could not be deleted.");
        return;
      }
      router.refresh();
    });
  }

  const open = tasks.find((t) => t.id === openId) ?? null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <>
      {error ? (
        <p className="rounded-[8px] border border-[#ef4444]/40! bg-[#ef4444]/[0.06] px-[16px] py-[12px] text-[13px] font-medium text-[#ef4444]">
          {error}
        </p>
      ) : null}

      <DndContext
        // A fixed id: without one dnd-kit numbers its aria-describedby per
        // mount, which differs between the server render and the client one and
        // trips a hydration mismatch on every card.
        id="v2-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) =>
          setDragging(tasks.find((t) => t.id === e.active.id) ?? null)
        }
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex items-start gap-[20px]">
          {COLUMNS.map((column) => {
            const columnTasks = inColumn(column.id);
            return (
              <Column
                key={column.id}
                id={column.id}
                label={column.label}
                tasks={columnTasks}
                empty={EMPTY[column.id] ?? "Nothing here"}
                adding={adding === column.id}
                draft={draft}
                onDraft={setDraft}
                onStartAdding={() => {
                  setAdding(column.id);
                  setDraft("");
                }}
                onCancelAdding={() => setAdding(null)}
                onAdd={() => add(column.id)}
                onOpen={setOpenId}
              />
            );
          })}
        </div>

        <DragOverlay>
          {dragging ? <CardFace task={dragging} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <TaskModal
        task={open}
        members={members}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onClose={() => setOpenId(null)}
        onDelete={() => open && remove(open.id)}
      />
    </>
  );
}

function Column({
  id,
  label,
  tasks,
  empty,
  adding,
  draft,
  onDraft,
  onStartAdding,
  onCancelAdding,
  onAdd,
  onOpen,
}: {
  id: string;
  label: string;
  tasks: Task[];
  empty: string;
  adding: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
      <div className="flex items-center justify-between border-b-2 border-[#243033]! pb-[8px]">
        <div className="flex items-center gap-[8px]">
          <p className="text-[15px] font-bold text-[#e2e8f0]">{label}</p>
          <span className="rounded-full bg-[#171e24] px-[8px] py-[2px] text-[11px] font-bold text-[#94a3b8]">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onStartAdding}
          aria-label={`Add to ${label}`}
          className="cursor-pointer rounded-[6px] bg-white/[0.03] p-[6px] transition-colors hover:bg-white/[0.06]"
        >
          <Plus size={12} strokeWidth={2} className="block text-[#94a3b8]" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[80px] flex-col gap-[12px] rounded-[12px] transition-colors ${
          isOver ? "bg-[#8fb0a7]/[0.06]" : ""
        }`}
      >
        {tasks.length === 0 && !adding ? (
          <div className="flex flex-col items-center justify-center gap-[12px] rounded-[12px] border border-dashed border-[#243033]! p-[32px]">
            <Inbox size={24} strokeWidth={2} className="text-[#64748b]" />
            <p className="text-center text-[13px] font-normal text-[#64748b]">
              {empty}
            </p>
          </div>
        ) : null}

        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </SortableContext>
      </div>

      {adding ? (
        <div className="flex flex-col gap-[8px] rounded-[12px] border border-[#8fb0a7]! bg-[#171e24] p-[12px]">
          <textarea
            value={draft}
            autoFocus
            rows={2}
            placeholder="What needs doing?"
            aria-label={`New card in ${label}`}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onAdd();
              }
              if (e.key === "Escape") onCancelAdding();
            }}
            className="w-full resize-none bg-transparent text-[13px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#64748b]"
          />
          <div className="flex items-center justify-end gap-[8px]">
            <button
              type="button"
              onClick={onCancelAdding}
              aria-label="Cancel"
              className="cursor-pointer rounded-[6px] p-[6px] text-[#64748b] transition-colors hover:text-[#e2e8f0]"
            >
              <X size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onAdd}
              disabled={!draft.trim()}
              className="cursor-pointer rounded-[6px] bg-[#8fb0a7] px-[12px] py-[6px] text-[12px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
            >
              Add card
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartAdding}
          className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-[#243033]! p-[12px] text-[13px] font-semibold text-[#64748b] transition-colors hover:border-[#2f3d42]! hover:text-[#94a3b8]"
        >
          <Plus size={12} strokeWidth={2} />
          Add a card
        </button>
      )}
    </div>
  );
}

function SortableCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <CardFace
        task={task}
        onOpen={() => onOpen(task.id)}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function CardFace({
  task,
  onOpen,
  handleProps,
  dragging = false,
}: {
  task: Task;
  onOpen?: () => void;
  handleProps?: Record<string, unknown>;
  dragging?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-[10px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[14px] ${
        dragging ? "shadow-[0px_18px_40px_-12px_rgba(0,0,0,0.6)]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-[8px]">
        <div className="flex min-w-0 items-center gap-[8px]">
          <span
            {...handleProps}
            aria-label="Drag card"
            className="shrink-0 cursor-grab text-[#64748b] active:cursor-grabbing"
          >
            <GripVertical size={12} strokeWidth={2} />
          </span>
          <button
            type="button"
            onClick={onOpen}
            aria-haspopup="dialog"
            className="min-w-0 cursor-pointer truncate text-left text-[13px] font-semibold text-[#e2e8f0]"
          >
            {task.title}
          </button>
        </div>
        {task.commentCount > 0 ? (
          <span className="shrink-0 text-[11px] font-normal text-[#64748b]">
            {task.commentCount} comment{task.commentCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {task.note ? (
        <div className="flex items-center gap-[6px]">
          <span className="h-[14px] w-[2px] shrink-0 rounded-full bg-[#8fb0a7]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-[#94a3b8]">
            {task.note}
          </span>
        </div>
      ) : null}

      {task.assignees.length > 0 ? (
        <div className="flex items-center gap-[4px]">
          {task.assignees.map((m) => (
            <span
              key={m.id}
              title={m.name}
              className="flex size-[20px] items-center justify-center rounded-full bg-[#243033] text-[9px] font-bold text-[#e2e8f0]"
            >
              {m.name.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

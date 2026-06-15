"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, GripVertical } from "lucide-react";
import { COLUMNS, type Task } from "./columns";
import { createTask, moveTask, deleteTask, listTasks } from "./actions";

type Columns = Record<string, Task[]>;

const GAP = 100; // spacing used when appending / prepending a card

function groupTasks(tasks: Task[]): Columns {
  const cols: Columns = {};
  for (const c of COLUMNS) cols[c.id] = [];
  for (const t of [...tasks].sort((a, b) => a.position - b.position)) {
    const key = cols[t.status] ? t.status : COLUMNS[0].id;
    cols[key].push(t);
  }
  return cols;
}

function findContainer(cols: Columns, id: string): string | undefined {
  if (id in cols) return id;
  return Object.keys(cols).find((k) => cols[k].some((t) => t.id === id));
}

// ── Card ──────────────────────────────────────────────────────────────────

function CardShell({
  title,
  dragging,
  overlay,
  handleProps,
  onDelete,
  setNodeRef,
  style,
}: {
  title: string;
  dragging?: boolean;
  overlay?: boolean;
  handleProps?: Record<string, unknown>;
  onDelete?: () => void;
  setNodeRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/card flex items-start gap-2 border border-border bg-surface px-3 py-2.5 text-sm ${
        dragging ? "opacity-40" : ""
      } ${overlay ? "scale-[1.02] cursor-grabbing border-muted shadow-xl shadow-black/50" : ""}`}
    >
      <button
        type="button"
        aria-label="Drag"
        className="mt-0.5 cursor-grab text-muted transition-colors hover:text-foreground active:cursor-grabbing"
        {...handleProps}
      >
        <GripVertical size={14} strokeWidth={1.75} />
      </button>
      <span className="flex-1 leading-snug text-foreground">{title}</span>
      {onDelete ? (
        <button
          type="button"
          aria-label="Delete task"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-muted opacity-0 transition-opacity hover:text-red-400 group-hover/card:opacity-100"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      ) : null}
    </div>
  );
}

function SortableCard({
  task,
  onDelete,
}: {
  task: Task;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <CardShell
      title={task.title}
      dragging={isDragging}
      setNodeRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      handleProps={{ ...attributes, ...listeners }}
      onDelete={() => onDelete(task.id)}
    />
  );
}

// ── Column ────────────────────────────────────────────────────────────────

function Column({
  id,
  label,
  tasks,
  onAdd,
  onDelete,
}: {
  id: string;
  label: string;
  tasks: Task[];
  onAdd: (status: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");

  function submit() {
    const t = value.trim();
    if (t) onAdd(id, t);
    setValue("");
    setAdding(false);
  }

  return (
    <div className="flex flex-col border border-border bg-surface-2/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
          <span className="border border-border px-1.5 text-[11px] text-muted">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Add to ${label}`}
          onClick={() => setAdding((a) => !a)}
          className="flex h-6 w-6 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-32 flex-1 flex-col gap-2 p-2 transition-colors ${
          isOver ? "bg-surface-2" : ""
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((t) => (
            <SortableCard key={t.id} task={t} onDelete={onDelete} />
          ))}
        </SortableContext>

        {adding ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") {
                setValue("");
                setAdding(false);
              }
            }}
            placeholder="Card title…"
            className="border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-muted"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-wipe flex items-center gap-1.5 border border-dashed border-border px-3 py-2 text-left text-xs text-muted"
          >
            <Plus size={13} strokeWidth={2} />
            Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────

export default function KanbanBoard({ initialTasks }: { initialTasks: Task[] }) {
  // Optimistic state is authoritative for this session; seeded once from props.
  const [columns, setColumns] = useState<Columns>(() => groupTasks(initialTasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  // Remember the column a drag started in, to know if it actually moved.
  const startContainer = useRef<string | undefined>(undefined);
  // Mirror of `columns` so drag handlers can read the latest state without
  // performing side effects (the persist call) inside a setState updater.
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  // Realtime: don't clobber an in-progress drag; defer the sync until it ends.
  const activeIdRef = useRef<string | null>(activeId);
  activeIdRef.current = activeId;
  const pendingSync = useRef(false);

  // Replace local state with server truth (used when a remote change arrives).
  const reconcile = useCallback(async () => {
    if (activeIdRef.current) {
      pendingSync.current = true;
      return;
    }
    pendingSync.current = false;
    try {
      const tasks = await listTasks();
      setColumns(groupTasks(tasks));
    } catch {
      // transient; the next event (or heartbeat-driven reconnect) retries
    }
  }, []);

  // Subscribe to the live board stream; refetch + reconcile on each change.
  useEffect(() => {
    const source = new EventSource("/api/board/stream");
    source.onmessage = () => {
      void reconcile();
    };
    return () => source.close();
  }, [reconcile]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeTask = useMemo(() => {
    if (!activeId) return null;
    for (const list of Object.values(columns)) {
      const t = list.find((x) => x.id === activeId);
      if (t) return t;
    }
    return null;
  }, [activeId, columns]);

  function computePosition(list: Task[], index: number): number {
    const prev = list[index - 1]?.position;
    const next = list[index + 1]?.position;
    if (prev != null && next != null) return (prev + next) / 2;
    if (next != null) return next - GAP;
    if (prev != null) return prev + GAP;
    return Date.now();
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    startContainer.current = findContainer(columns, id);
  }

  // Live cross-column movement so cards animate as you drag between columns.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    setColumns((prev) => {
      const from = findContainer(prev, activeId);
      const to = findContainer(prev, overId);
      if (!from || !to || from === to) return prev;

      const fromItems = prev[from];
      const toItems = prev[to];
      const moving = fromItems.find((t) => t.id === activeId);
      if (!moving) return prev;

      const overIndex =
        overId in prev ? toItems.length : toItems.findIndex((t) => t.id === overId);
      const insertAt = overIndex < 0 ? toItems.length : overIndex;

      return {
        ...prev,
        [from]: fromItems.filter((t) => t.id !== activeId),
        [to]: [
          ...toItems.slice(0, insertAt),
          { ...moving, status: to },
          ...toItems.slice(insertAt),
        ],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const id = String(active.id);
    const from = startContainer.current;
    setActiveId(null);
    startContainer.current = undefined;
    if (!over) return;

    const current = columnsRef.current;
    const dest = findContainer(current, id);
    if (!dest) return;

    let items = current[dest];
    const overId = String(over.id);
    // Same-column reorder: settle into the hovered card's slot.
    if (!(overId in current) && overId !== id) {
      const oldIndex = items.findIndex((t) => t.id === id);
      const newIndex = items.findIndex((t) => t.id === overId);
      if (oldIndex >= 0 && newIndex >= 0 && oldIndex !== newIndex) {
        items = arrayMove(items, oldIndex, newIndex);
      }
    }

    const index = items.findIndex((t) => t.id === id);
    if (index < 0) return;
    const movedColumns = Boolean(from && from !== dest);
    // No-op drop in the same spot: skip the write.
    if (!movedColumns && items === current[dest]) return;

    const position = computePosition(items, index);
    const settled = items.map((t) =>
      t.id === id ? { ...t, status: dest, position } : t,
    );
    setColumns((prev) => ({ ...prev, [dest]: settled }));
    void (async () => {
      await moveTask({ id, status: dest, position });
      // If a remote change arrived mid-drag, apply it now that we're idle.
      if (pendingSync.current) void reconcile();
    })();
  }

  function handleAdd(status: string, title: string) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const task: Task = { id, title, note: "", status, position: Date.now() };
    setColumns((prev) => ({ ...prev, [status]: [...prev[status], task] }));
    void createTask({ id, title, status });
  }

  function handleDelete(id: string) {
    setColumns((prev) => {
      const next: Columns = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].filter((t) => t.id !== id);
      }
      return next;
    });
    void deleteTask(id);
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="fx-rise grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={columns[col.id] ?? []}
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <CardShell title={activeTask.title} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

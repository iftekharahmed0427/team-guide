"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import {
  Plus,
  X,
  GripVertical,
  MessageSquare,
  Check,
  Users,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { COLUMNS, type Task, type Member, type Comment } from "./columns";
import {
  createTask,
  moveTask,
  deleteTask,
  listTasks,
  listComments,
  addComment,
  deleteComment,
  assignMember,
  unassignMember,
} from "./actions";
import Avatar from "@/app/components/avatar";

type Columns = Record<string, Task[]>;

const GAP = 100; // spacing used when appending / prepending a card

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatWhen(d: string) {
  const x = new Date(d);
  let h = x.getHours();
  const m = x.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${SHORT_MONTHS[x.getMonth()]} ${x.getDate()} · ${h}:${String(m).padStart(2, "0")} ${ap}`;
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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
  task,
  title,
  dragging,
  overlay,
  handleProps,
  onDelete,
  onOpen,
  setNodeRef,
  style,
}: {
  task?: Task;
  title: string;
  dragging?: boolean;
  overlay?: boolean;
  handleProps?: Record<string, unknown>;
  onDelete?: () => void;
  onOpen?: () => void;
  setNodeRef?: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  const assignees = task?.assignees ?? [];
  const commentCount = task?.commentCount ?? 0;
  const hasMeta = assignees.length > 0 || commentCount > 0;

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

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="flex flex-1 flex-col gap-2 text-left disabled:cursor-default"
      >
        <span className="leading-snug text-foreground">{title}</span>
        {hasMeta ? (
          <span className="flex items-center gap-2.5 text-muted">
            {assignees.length > 0 ? (
              <span className="flex items-center -space-x-1.5">
                {assignees.slice(0, 3).map((a) => (
                  <Avatar
                    key={a.id}
                    name={a.name}
                    image={a.image}
                    size={18}
                    className="ring-1 ring-surface"
                  />
                ))}
                {assignees.length > 3 ? (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-border bg-surface-2 px-1 text-[10px] font-semibold leading-none ring-1 ring-surface">
                    +{assignees.length - 3}
                  </span>
                ) : null}
              </span>
            ) : null}
            {commentCount > 0 ? (
              <span className="flex items-center gap-1 text-[11px]">
                <MessageSquare size={12} strokeWidth={1.75} />
                {commentCount}
              </span>
            ) : null}
          </span>
        ) : null}
      </button>

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
  onOpen,
}: {
  task: Task;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  return (
    <CardShell
      task={task}
      title={task.title}
      dragging={isDragging}
      setNodeRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      handleProps={{ ...attributes, ...listeners }}
      onDelete={() => onDelete(task.id)}
      onOpen={() => onOpen(task.id)}
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
  onOpen,
}: {
  id: string;
  label: string;
  tasks: Task[];
  onAdd: (status: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
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
            <SortableCard key={t.id} task={t} onDelete={onDelete} onOpen={onOpen} />
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

// ── Card detail modal ───────────────────────────────────────────────────────

function CommentRow({
  comment,
  canDelete,
  isMine,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  isMine: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border border-border bg-surface-2/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Avatar name={comment.authorName} image={comment.authorImage} size={22} />
          <div className="leading-tight">
            <p className="text-xs font-medium text-foreground">
              {comment.authorName || "Member"}
              {isMine ? <span className="text-muted"> (you)</span> : null}
            </p>
            <p className="text-[11px] text-muted">{formatWhen(comment.createdAt)}</p>
          </div>
        </div>
        {canDelete ? (
          <button
            type="button"
            aria-label="Delete comment"
            onClick={() => onDelete(comment.id)}
            className="flex h-6 w-6 items-center justify-center border border-transparent text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        ) : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
        {comment.body}
      </p>
    </div>
  );
}

function CardModal({
  task,
  members,
  isAdmin,
  currentUserId,
  currentUserImage,
  refreshKey,
  onClose,
  onToggleAssignee,
  onCommentCountChange,
}: {
  task: Task;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string | null;
  currentUserImage: string | null;
  refreshKey: number;
  onClose: () => void;
  onToggleAssignee: (member: Member, assign: boolean) => void;
  onCommentCountChange: (delta: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Refetch comments when the card opens or any board change arrives.
  useEffect(() => {
    let cancelled = false;
    listComments(task.id)
      .then((rows) => {
        if (!cancelled) {
          setComments(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [task.id, refreshKey]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    setError(null);
    const text = body.trim();
    if (!text) return;
    const id = newId();
    const optimistic: Comment = {
      id,
      taskId: task.id,
      body: text,
      authorId: currentUserId,
      authorName: "You",
      authorImage: currentUserImage,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setBody("");
    onCommentCountChange(1);
    startTransition(async () => {
      const res = await addComment({ id, taskId: task.id, body: text });
      if ("error" in res) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        onCommentCountChange(-1);
        setError(res.error);
      }
    });
  }

  function handleDeleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    onCommentCountChange(-1);
    void deleteComment(id);
  }

  const assignedIds = new Set(task.assignees.map((a) => a.id));

  return (
    <div
      className="fx-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col border border-border bg-surface shadow-2xl shadow-black/50"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold leading-snug tracking-tight">
            {task.title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:text-foreground"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Assignees */}
          <section className="border-b border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                <Users size={13} strokeWidth={2} />
                Assignees
              </h3>
              {isAdmin && members.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen((o) => !o)}
                    className="btn-wipe flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                  >
                    <Plus size={13} strokeWidth={2} />
                    Assign
                  </button>
                  {pickerOpen ? (
                    <ul className="fx-menu absolute right-0 z-30 mt-1 max-h-56 w-56 overflow-y-auto border border-border bg-surface py-1 shadow-lg shadow-black/40">
                      {members.map((m) => {
                        const assigned = assignedIds.has(m.id);
                        return (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => onToggleAssignee(m, !assigned)}
                              className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-2 ${
                                assigned ? "text-foreground" : "text-muted"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <Avatar name={m.name} image={m.image} size={20} />
                                <span className="truncate">{m.name}</span>
                              </span>
                              {assigned ? (
                                <Check size={14} strokeWidth={2} className="shrink-0" />
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {task.assignees.length === 0 ? (
                <p className="text-xs text-muted">
                  No one assigned{isAdmin ? " yet." : "."}
                </p>
              ) : (
                task.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="flex items-center gap-1.5 border border-border bg-surface-2/40 py-1 pl-1.5 pr-2 text-xs"
                  >
                    <Avatar name={a.name} image={a.image} size={18} />
                    <span className="text-foreground">{a.name}</span>
                    {isAdmin ? (
                      <button
                        type="button"
                        aria-label={`Unassign ${a.name}`}
                        onClick={() => onToggleAssignee(a, false)}
                        className="text-muted transition-colors hover:text-red-400"
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    ) : null}
                  </span>
                ))
              )}
            </div>
          </section>

          {/* Comments */}
          <section className="px-5 py-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              <MessageSquare size={13} strokeWidth={2} />
              Comments
              {comments.length > 0 ? (
                <span className="text-muted">· {comments.length}</span>
              ) : null}
            </h3>

            <div className="mt-3 flex flex-col gap-2">
              {loading ? (
                <p className="text-xs text-muted">Loading…</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <CommentRow
                    key={c.id}
                    comment={c}
                    isMine={c.authorId != null && c.authorId === currentUserId}
                    canDelete={
                      isAdmin || (c.authorId != null && c.authorId === currentUserId)
                    }
                    onDelete={handleDeleteComment}
                  />
                ))
              )}
            </div>
          </section>
        </div>

        {/* Composer */}
        <div className="border-t border-border p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            rows={2}
            placeholder="Write a comment…"
            className="w-full resize-none border border-border bg-surface-2 px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted focus:border-muted"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            {error ? (
              <span className="text-xs text-red-400">{error}</span>
            ) : (
              <span className="text-xs text-muted">⌘/Ctrl + Enter to send</span>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={pending || !body.trim()}
              className="btn-wipe btn-wipe-dark flex h-8 shrink-0 items-center gap-2 border border-border bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
            >
              {pending ? (
                <Loader2 size={14} strokeWidth={2} className="animate-spin" />
              ) : (
                <Send size={14} strokeWidth={2} />
              )}
              Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────

export default function KanbanBoard({
  initialTasks,
  members,
  isAdmin,
  currentUserId,
  currentUserImage,
}: {
  initialTasks: Task[];
  members: Member[];
  isAdmin: boolean;
  currentUserId: string | null;
  currentUserImage: string | null;
}) {
  // Optimistic state is authoritative for this session; seeded once from props.
  const [columns, setColumns] = useState<Columns>(() => groupTasks(initialTasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modalId, setModalId] = useState<string | null>(null);
  // Bumped on every live board event so the open card modal refetches comments.
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Subscribe to the app-wide realtime stream; refetch + reconcile on each
  // change. (Board data only shows here, but the stream is shared app-wide.)
  useEffect(() => {
    const source = new EventSource("/api/realtime");
    source.onmessage = () => {
      setRefreshKey((k) => k + 1);
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

  // Live task backing the open modal (so assignees/counts update via reconcile).
  const modalTask = useMemo(() => {
    if (!modalId) return null;
    for (const list of Object.values(columns)) {
      const t = list.find((x) => x.id === modalId);
      if (t) return t;
    }
    return null;
  }, [modalId, columns]);

  // If the open card was deleted (locally or remotely), close the modal.
  useEffect(() => {
    if (modalId && !modalTask) setModalId(null);
  }, [modalId, modalTask]);

  function updateTask(id: string, patch: (t: Task) => Task) {
    setColumns((prev) => {
      const next: Columns = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].map((t) => (t.id === id ? patch(t) : t));
      }
      return next;
    });
  }

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
    const id = newId();
    const task: Task = {
      id,
      title,
      note: "",
      status,
      position: Date.now(),
      assignees: [],
      commentCount: 0,
    };
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

  // Admin assign/unassign, optimistic then persisted; reconcile corrects.
  function handleToggleAssignee(taskId: string, member: Member, assign: boolean) {
    updateTask(taskId, (t) => ({
      ...t,
      assignees: assign
        ? t.assignees.some((a) => a.id === member.id)
          ? t.assignees
          : [...t.assignees, member]
        : t.assignees.filter((a) => a.id !== member.id),
    }));
    void (assign
      ? assignMember({ taskId, userId: member.id })
      : unassignMember({ taskId, userId: member.id }));
  }

  function handleCommentCountChange(taskId: string, delta: number) {
    updateTask(taskId, (t) => ({
      ...t,
      commentCount: Math.max(0, t.commentCount + delta),
    }));
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
            onOpen={setModalId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <CardShell task={activeTask} title={activeTask.title} overlay /> : null}
      </DragOverlay>

      {modalTask ? (
        <CardModal
          task={modalTask}
          members={members}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          currentUserImage={currentUserImage}
          refreshKey={refreshKey}
          onClose={() => setModalId(null)}
          onToggleAssignee={(member, assign) =>
            handleToggleAssignee(modalTask.id, member, assign)
          }
          onCommentCountChange={(delta) =>
            handleCommentCountChange(modalTask.id, delta)
          }
        />
      ) : null}
    </DndContext>
  );
}

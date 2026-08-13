import { GripVertical, Inbox, Plus } from "lucide-react";

// /v2/board - the redesign's kanban board, built from the "kanban-board-page"
// Figma frame (node 43:4): three columns, each with a counted header, its cards
// and a quick-add row. Shell comes from app/v2/layout.tsx.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing here reads from the database. Cards are not draggable yet either,
// despite the subtitle; the real board uses dnd-kit.

type Task = { author: string; at: string; subject: string };

type Column = { title: string; tasks: Task[]; empty: string };

const COLUMNS: Column[] = [
  { title: "To Do", tasks: [], empty: "No tasks in backlog" },
  {
    title: "In Progress",
    empty: "Nothing in progress",
    tasks: [
      { author: "n0scape", at: "15m ago", subject: "General Question" },
      { author: "wolfely", at: "1h ago", subject: "Minecraft" },
      { author: "imjustalittlesis", at: "3h ago", subject: "Minecraft" },
    ],
  },
  {
    title: "Done",
    empty: "Nothing finished yet",
    tasks: [
      { author: "skemmer", at: "Yesterday", subject: "minecraft" },
      { author: "shawn086091", at: "Yesterday", subject: "MPS" },
      { author: "dstormr9ff", at: "2d ago", subject: "MPS" },
      { author: "portedcase", at: "3d ago", subject: "Minecraft" },
      { author: "sjsip", at: "4d ago", subject: "SOS" },
    ],
  },
];

export default function V2BoardPage() {
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

      <div className="flex items-start gap-[20px]">
        {COLUMNS.map((column) => (
          <div key={column.title} className="flex min-w-0 flex-1 flex-col gap-[16px]">
            <div className="flex items-center justify-between border-b-2 border-[#243033]! pb-[8px]">
              <div className="flex items-center gap-[8px]">
                <p className="text-[15px] font-bold text-[#e2e8f0]">{column.title}</p>
                <span className="rounded-full bg-[#171e24] px-[8px] py-[2px] text-[11px] font-bold text-[#94a3b8]">
                  {column.tasks.length}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Add to ${column.title}`}
                className="cursor-pointer rounded-[6px] bg-white/[0.03] p-[6px]"
              >
                <Plus size={12} strokeWidth={2} className="block text-[#94a3b8]" />
              </button>
            </div>

            {column.tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-[12px] rounded-[12px] border border-dashed border-[#243033]! p-[32px]">
                <Inbox size={24} strokeWidth={2} className="text-[#64748b]" />
                <p className="text-center text-[13px] font-normal text-[#64748b]">{column.empty}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {column.tasks.map((task) => (
                  <div
                    key={`${column.title}-${task.author}-${task.at}`}
                    className="flex flex-col gap-[10px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[14px]"
                  >
                    <div className="flex items-center justify-between gap-[8px]">
                      <span className="flex min-w-0 items-center gap-[8px]">
                        <GripVertical
                          size={12}
                          strokeWidth={2}
                          className="shrink-0 text-[#64748b]"
                        />
                        <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">
                          {task.author}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] font-normal text-[#64748b]">
                        {task.at}
                      </span>
                    </div>
                    <div className="flex items-center gap-[6px]">
                      <span className="h-[14px] w-[2px] shrink-0 rounded-full bg-[#8fb0a7]" />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-normal text-[#94a3b8]">
                        {task.subject}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-[#243033]! p-[12px] text-[13px] font-semibold text-[#64748b] transition-colors hover:border-[#2f3d42]! hover:text-[#94a3b8]"
            >
              <Plus size={12} strokeWidth={2} />
              Add a card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

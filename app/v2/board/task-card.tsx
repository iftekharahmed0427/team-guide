"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import V2TaskModal, { type BoardTask } from "./task-modal";

// A board card plus the detail modal it opens. A small client island so
// app/v2/board/page.tsx can stay a server component.
//
// The card keeps the grip handle from the frame, but dragging is still not
// wired; the real board uses dnd-kit.

export default function TaskCard({ task }: { task: BoardTask }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex cursor-pointer flex-col gap-[10px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[14px] text-left transition-colors hover:border-[#2f3d42]!"
      >
        <span className="flex items-center justify-between gap-[8px]">
          <span className="flex min-w-0 items-center gap-[8px]">
            <GripVertical size={12} strokeWidth={2} className="shrink-0 text-[#64748b]" />
            <span className="truncate text-[13px] font-semibold text-[#e2e8f0]">{task.author}</span>
          </span>
          <span className="shrink-0 text-[11px] font-normal text-[#64748b]">{task.at}</span>
        </span>
        <span className="flex items-center gap-[6px]">
          <span className="h-[14px] w-[2px] shrink-0 rounded-full bg-[#8fb0a7]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-[#94a3b8]">
            {task.subject}
          </span>
        </span>
      </button>
      <V2TaskModal task={open ? task : null} onClose={() => setOpen(false)} />
    </>
  );
}

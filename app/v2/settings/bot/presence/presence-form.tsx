"use client";

import { useState } from "react";
import { updatePresence } from "@/lib/actions/bot";
import V2Select from "../../../custom-select";
import { Field, SaveBar, useAction } from "../../settings-controls";

// Presence, with the preview updating as you edit rather than after saving,
// which is the point of having a preview at all.
//
// The two pickers are the shared v2 select, so this matches every other picker
// in the redesign. The values are the ones the live action validates against.

const STATUSES = [
  { value: "online", label: "Online" },
  { value: "idle", label: "Idle" },
  { value: "dnd", label: "Do not disturb" },
  { value: "invisible", label: "Invisible" },
];

const ACTIVITIES = [
  { value: "none", label: "No activity" },
  { value: "Playing", label: "Playing" },
  { value: "Watching", label: "Watching" },
  { value: "Listening", label: "Listening" },
  { value: "Competing", label: "Competing" },
  { value: "Custom", label: "Custom" },
];

const DOT: Record<string, string> = {
  online: "bg-[#10b981]",
  idle: "bg-[#f59e0b]",
  dnd: "bg-[#ef4444]",
  invisible: "bg-[#64748b]",
};

export default function PresenceForm({
  initial,
}: {
  initial: {
    presenceStatus: string;
    presenceActivityType: string;
    presenceActivityText: string;
  };
}) {
  const { run, pending, error, saved } = useAction();
  const [status, setStatus] = useState(initial.presenceStatus);
  const [type, setType] = useState(initial.presenceActivityType);
  const [text, setText] = useState(initial.presenceActivityText);

  const dirty =
    status !== initial.presenceStatus ||
    type !== initial.presenceActivityType ||
    text !== initial.presenceActivityText;

  const hasActivity = type !== "none" && text.trim().length > 0;
  const statusLabel =
    STATUSES.find((s) => s.value === status)?.label ?? status;

  return (
    <div className="flex flex-col gap-[20px]">
      <div className="flex items-start gap-[16px]">
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <p className="text-[12px] font-semibold text-[#94a3b8]">Status</p>
          <V2Select
            id="presence-status"
            ariaLabel="Status"
            value={status}
            options={STATUSES}
            onChange={setStatus}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <p className="text-[12px] font-semibold text-[#94a3b8]">Activity</p>
          <V2Select
            id="presence-activity"
            ariaLabel="Activity"
            value={type}
            options={ACTIVITIES}
            onChange={setType}
          />
        </div>
      </div>

      <Field
        id="presence-text"
        label="Activity text"
        hint="The line after the activity word. Up to 128 characters."
        value={text}
        disabled={pending || type === "none"}
        placeholder={type === "none" ? "Pick an activity first" : "the ticket queue"}
        onChange={setText}
      />

      <div className="flex items-center gap-[12px] rounded-[8px] bg-[#0e1217] p-[16px]">
        <span className="relative shrink-0">
          <span className="flex size-[36px] items-center justify-center rounded-full bg-[#8fb0a7] text-[13px] font-bold text-[#0e1217]">
            GH
          </span>
          <span
            className={`absolute right-[-1px] bottom-[-1px] size-[12px] rounded-full border-[2px] border-[#0e1217]! ${DOT[status] ?? "bg-[#64748b]"}`}
          />
        </span>
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[14px] font-semibold text-[#e2e8f0]">Gravel Host</p>
          <p className="truncate text-[12px] font-normal text-[#94a3b8]">
            {hasActivity ? `${type} ${text.trim()}` : statusLabel}
          </p>
        </div>
      </div>

      <SaveBar
        pending={pending}
        error={error}
        saved={saved}
        disabled={!dirty}
        hint="The bot picks this up on its next check-in."
        onSave={() =>
          run(() =>
            updatePresence({
              presenceStatus: status,
              presenceActivityType: type,
              presenceActivityText: text,
            }),
          )
        }
      />
    </div>
  );
}

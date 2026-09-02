"use client";

import { useState } from "react";
import { Hash, Loader2, Plus } from "lucide-react";
import {
  addReportChannel,
  deleteReportChannel,
  resetReportChannel,
} from "@/lib/actions/bot";
import CustomSelect from "../../../custom-select";
import {
  ConfirmButton,
  ErrorLine,
  Field,
  LABEL,
  SavedFlash,
  useAction,
} from "../../settings-controls";

// The channels the bot counts screenshots in: the list, plus the form that adds
// one. Every write is the live action.
//
// Resetting a channel zeroes its tally and starts counting from now, which is
// per-channel and unrelated to ending a period. Deleting stops counting it at
// all. Both ask before firing.

export type Channel = {
  id: string;
  channelId: string;
  name: string;
  owner: string;
  currentCount: number;
  since: string;
};

export type Member = { discordId: string; name: string };

const UNASSIGNED = "__everyone__";

export default function ChannelsManager({
  channels,
  members,
}: {
  channels: Channel[];
  members: Member[];
}) {
  const { run, pending, error, saved } = useAction();
  const [channelId, setChannelId] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState(UNASSIGNED);

  const total = channels.reduce((sum, c) => sum + c.currentCount, 0);

  function add() {
    run(
      () =>
        addReportChannel({
          channelId,
          userId: userId === UNASSIGNED ? null : userId,
          name: name.trim(),
        }),
      () => {
        setChannelId("");
        setName("");
        setUserId(UNASSIGNED);
      },
    );
  }

  // deleteReportChannel takes a FormData, being a form action on the live page.
  function remove(id: string) {
    const data = new FormData();
    data.set("id", id);
    run(async () => {
      await deleteReportChannel(data);
    });
  }

  const COL = {
    channel: "min-w-0 flex-1",
    member: "w-[150px]",
    count: "w-[80px] text-right",
    since: "w-[150px] text-right",
    actions: "w-[190px]",
  };

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[16px]">
      {channels.length === 0 ? (
        <p className="py-[8px] text-[13px] font-normal text-[#64748b]">
          No report channels yet, so nothing is being counted.
        </p>
      ) : (
        <div className="flex flex-col overflow-x-auto">
          <div className="flex min-w-[820px] flex-col">
            <div className="flex items-center rounded-[6px] bg-[#0e1217] px-[14px] py-[10px] text-[11px] font-bold text-[#94a3b8] uppercase">
              <p className={COL.channel}>Channel</p>
              <p className={COL.member}>Counts for</p>
              <p className={COL.count}>Tickets</p>
              <p className={COL.since}>Counting since</p>
              <p className={COL.actions} />
            </div>

            {channels.map((c) => (
              <div
                key={c.id}
                className="flex items-center border-b border-[#243033]! px-[14px] py-[12px] last:border-0"
              >
                <div className={`flex items-center gap-[10px] ${COL.channel}`}>
                  <Hash
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-[#64748b]"
                  />
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                      {c.name || "Unnamed channel"}
                    </p>
                    <p className="truncate font-mono text-[11px] font-normal text-[#64748b]">
                      {c.channelId}
                    </p>
                  </div>
                </div>
                <p
                  className={`truncate pr-[12px] text-[13px] font-normal text-[#94a3b8] ${COL.member}`}
                >
                  {c.owner}
                </p>
                <p
                  className={`text-[14px] font-bold text-[#e2e8f0] tabular-nums ${COL.count}`}
                >
                  {c.currentCount.toLocaleString()}
                </p>
                <p
                  className={`pr-[12px] text-[12px] font-normal text-[#64748b] ${COL.since}`}
                >
                  {c.since}
                </p>
                <div
                  className={`flex items-center justify-end gap-[8px] ${COL.actions}`}
                >
                  <ConfirmButton
                    label="Reset"
                    confirmLabel="Reset count"
                    tone="warning"
                    pending={pending}
                    onConfirm={() => run(() => resetReportChannel(c.id))}
                  />
                  <ConfirmButton
                    label="Remove"
                    confirmLabel="Remove"
                    pending={pending}
                    onConfirm={() => remove(c.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-[12px] rounded-[8px] bg-[#0e1217] p-[16px]">
        <p className="text-[13px] font-bold text-[#e2e8f0]">Add a channel</p>

        <div className="flex items-start gap-[12px]">
          <Field
            id="channel-id"
            label="Channel ID"
            value={channelId}
            disabled={pending}
            placeholder="Numbers only"
            onChange={(v) => setChannelId(v)}
          />
          <Field
            id="channel-name"
            label="Label"
            value={name}
            disabled={pending}
            placeholder="Whose channel it is"
            onChange={setName}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
            <p className={LABEL}>Counts for</p>
            <CustomSelect
              id="channel-member"
              ariaLabel="Counts for"
              value={userId}
              options={[
                { value: UNASSIGNED, label: "Everyone in it" },
                ...members.map((m) => ({ value: m.discordId, label: m.name })),
              ]}
              onChange={setUserId}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-[16px]">
          <div className="min-w-0 flex-1">
            {error ? (
              <ErrorLine message={error} />
            ) : (
              <SavedFlash shown={saved} />
            )}
          </div>
          <button
            type="button"
            onClick={add}
            disabled={pending || !channelId.trim()}
            className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[16px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
          >
            {pending ? (
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            ) : (
              <Plus size={14} strokeWidth={2} />
            )}
            Add channel
          </button>
        </div>

        <p className="text-[11px] font-normal text-[#64748b]">
          A new channel counts from the current period&apos;s start, not from
          the channel&apos;s whole history. {channels.length} channel
          {channels.length === 1 ? "" : "s"}, {total.toLocaleString()} tickets
          counted this period.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import {
  clearBotToken,
  requestRunNow,
  setBotToken,
} from "@/app/(app)/settings/discord-bot/actions";
import {
  ConfirmButton,
  ErrorLine,
  INPUT,
  SavedFlash,
  useAction,
} from "../settings-controls";

// The two things on the connection panel that write: the token and the run-now
// request. Both call the live actions.
//
// The token is set-only. The server never sends it back to the browser, so the
// form knows only whether one is stored and its last four characters.

export function TokenForm({
  hasToken,
  last4,
}: {
  hasToken: boolean;
  last4: string | null;
}) {
  const { run, pending, error, saved } = useAction();
  const [token, setToken] = useState("");
  const [editing, setEditing] = useState(!hasToken);

  function save() {
    const value = token.trim();
    if (!value) return;
    run(
      () => setBotToken(value),
      () => {
        setToken("");
        setEditing(false);
      },
    );
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-[10px]">
        <div className="flex items-center justify-between gap-[16px]">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <p className="text-[14px] font-semibold text-[#e2e8f0]">
              A token is saved
            </p>
            <p className="text-[12px] font-normal text-[#64748b]">
              Ending {last4}. It cannot be read back, only replaced.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[8px]">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[9px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
            >
              Replace
            </button>
            <ConfirmButton
              label="Clear"
              confirmLabel="Clear token"
              pending={pending}
              onConfirm={() => run(() => clearBotToken())}
            />
          </div>
        </div>
        <ErrorLine message={error} />
        <SavedFlash shown={saved} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex items-center gap-[8px]">
        <input
          type="password"
          value={token}
          disabled={pending}
          autoComplete="off"
          aria-label="Bot token"
          placeholder="Paste the bot token"
          onChange={(e) => setToken(e.target.value)}
          className={INPUT}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !token.trim()}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[16px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : null}
          Save token
        </button>
        {hasToken ? (
          <button
            type="button"
            onClick={() => {
              setToken("");
              setEditing(false);
            }}
            disabled={pending}
            className="shrink-0 cursor-pointer px-[8px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
          >
            Cancel
          </button>
        ) : null}
      </div>
      <ErrorLine message={error} />
      <SavedFlash shown={saved} />
    </div>
  );
}

export function RunNowButton({ hasToken }: { hasToken: boolean }) {
  const { run, pending, error, saved } = useAction();

  return (
    <div className="flex flex-col gap-[10px] pt-[4px]">
      <div className="flex items-center justify-between gap-[16px]">
        <p className="min-w-0 text-[13px] font-normal text-[#64748b]">
          {hasToken
            ? "Useful for checking the announcement looks right before a period ends."
            : "Set a token first: the bot cannot post without one."}
        </p>
        <button
          type="button"
          onClick={() => run(() => requestRunNow())}
          disabled={pending || !hasToken}
          className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Play size={14} strokeWidth={2} />
          )}
          Run now
        </button>
      </div>
      <ErrorLine message={error} />
      {saved ? (
        <p className="text-[12px] font-semibold text-[#10b981]">
          Asked for a run. The bot posts on its next check-in.
        </p>
      ) : null}
    </div>
  );
}

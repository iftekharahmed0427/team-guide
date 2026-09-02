"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import {
  resetAllReportChannels,
  updatePeriodLength,
} from "@/lib/actions/bot";
import {
  ErrorLine,
  INPUT,
  SavedFlash,
  useAction,
} from "../settings-controls";

// The two writes on the Period page.
//
// The length is a plain number. Ending the period is the most consequential
// action in the portal, so it takes two deliberate steps: it asks, and then it
// asks you to type the word.

export function PeriodLengthForm({ initial }: { initial: number }) {
  const { run, pending, error, saved } = useAction();
  const [days, setDays] = useState(String(initial));

  const parsed = Number(days);
  const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= 365;
  const dirty = parsed !== initial;

  return (
    <div className="flex flex-col gap-[12px]">
      <p className="text-[13px] font-normal text-[#94a3b8]">
        Drives the reports period label, the payments window and the bot&apos;s
        report range.
      </p>

      <div className="flex items-center gap-[8px]">
        <input
          value={days}
          disabled={pending}
          inputMode="numeric"
          aria-label="Period length in days"
          onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
          className={`${INPUT} w-[100px] text-right`}
        />
        <span className="text-[13px] font-normal text-[#94a3b8]">days</span>
        <button
          type="button"
          onClick={() => run(() => updatePeriodLength(parsed))}
          disabled={pending || !valid || !dirty}
          className="ml-[4px] flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#8fb0a7] px-[16px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : null}
          Save
        </button>
      </div>

      <ErrorLine message={error} />
      <SavedFlash shown={saved} />
      <p className="text-[11px] font-normal text-[#64748b]">
        Changing this does not move the current period: it only changes how long
        the next one is measured against.
      </p>
    </div>
  );
}

const CONFIRM_WORD = "end period";

export function EndPeriodButton({ channelCount }: { channelCount: number }) {
  const { run, pending, error, saved } = useAction();
  const [step, setStep] = useState<"idle" | "confirming">("idle");
  const [typed, setTyped] = useState("");

  const armed = typed.trim().toLowerCase() === CONFIRM_WORD;

  function reset() {
    setStep("idle");
    setTyped("");
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="mt-[20px] flex flex-col gap-[12px] rounded-[8px] border border-[#f59e0b]/40! bg-[#f59e0b]/[0.06] p-[16px]">
      <div className="flex items-center justify-between gap-[16px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <AlertTriangle
            size={16}
            strokeWidth={2}
            className="shrink-0 text-[#f59e0b]"
          />
          <p className="min-w-0 text-[13px] font-medium text-[#f59e0b]">
            This cannot be undone. Everything above moves to history and the
            counts start from zero.
          </p>
        </div>

        {step === "idle" ? (
          <button
            type="button"
            onClick={() => setStep("confirming")}
            disabled={channelCount === 0}
            title={
              channelCount === 0
                ? "There are no report channels to close"
                : undefined
            }
            className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#f59e0b] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#fbbf24] disabled:cursor-default disabled:opacity-60"
          >
            <RotateCcw size={14} strokeWidth={2} />
            End period
          </button>
        ) : null}
      </div>

      {step === "confirming" ? (
        <div className="flex items-center gap-[8px]">
          <input
            value={typed}
            disabled={pending}
            autoFocus
            aria-label={`Type ${CONFIRM_WORD} to confirm`}
            placeholder={`Type "${CONFIRM_WORD}" to confirm`}
            onChange={(e) => setTyped(e.target.value)}
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => setTyped("")}
            disabled={pending}
            className="shrink-0 cursor-pointer px-[8px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:text-[#e2e8f0]"
            hidden={!typed}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={pending}
            className="flex shrink-0 cursor-pointer items-center rounded-[8px] border border-[#243033]! bg-[#0e1217] px-[14px] py-[9px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => run(() => resetAllReportChannels(), reset)}
            disabled={pending || !armed}
            className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[6px] bg-[#f59e0b] px-[18px] py-[10px] text-[13px] font-semibold text-[#0e1217] transition-colors hover:bg-[#fbbf24] disabled:cursor-default disabled:opacity-60"
          >
            {pending ? (
              <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            ) : (
              <RotateCcw size={14} strokeWidth={2} />
            )}
            End the period
          </button>
        </div>
      ) : null}

      <ErrorLine message={error} />
      {saved ? (
        <p className="text-[12px] font-semibold text-[#10b981]">
          Period closed. The standings are in history and the bot posts the
          report on its next check-in.
        </p>
      ) : null}
    </div>
  );
}

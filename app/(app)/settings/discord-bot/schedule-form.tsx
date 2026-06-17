"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { updateBotSchedule } from "./actions";

type Settings = {
  periodAnchor: string;
  periodDays: number;
  postHour: number;
  postMinute: number;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function ScheduleForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [periodAnchor, setPeriodAnchor] = useState(settings.periodAnchor);
  const [periodDays, setPeriodDays] = useState(String(settings.periodDays));
  const [postHour, setPostHour] = useState(String(settings.postHour));
  const [postMinute, setPostMinute] = useState(String(settings.postMinute));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateBotSchedule({
        periodAnchor: periodAnchor.trim(),
        periodDays: Number(periodDays),
        postHour: Number(postHour),
        postMinute: Number(postMinute),
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const label = "mb-1.5 block text-xs font-medium text-muted";
  const field =
    "h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:border-muted";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="periodAnchor">
            Period end (a Friday)
          </label>
          <input
            id="periodAnchor"
            type="date"
            value={periodAnchor}
            onChange={(e) => setPeriodAnchor(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="periodDays">
            Period length (days)
          </label>
          <input
            id="periodDays"
            type="number"
            min={1}
            value={periodDays}
            onChange={(e) => setPeriodDays(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="postHour">
            Post hour (UTC, 0–23)
          </label>
          <input
            id="postHour"
            type="number"
            min={0}
            max={23}
            value={postHour}
            onChange={(e) => setPostHour(e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label} htmlFor="postMinute">
            Post minute (0–59)
          </label>
          <input
            id="postMinute"
            type="number"
            min={0}
            max={59}
            value={postMinute}
            onChange={(e) => setPostMinute(e.target.value)}
            className={field}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : (
          <span className="text-xs text-muted">
            Posts at {pad(Number(postHour) || 0)}:{pad(Number(postMinute) || 0)} UTC on
            period-end Fridays.
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : saved ? (
            <Check size={15} strokeWidth={2} />
          ) : null}
          {saved ? "Saved" : "Save schedule"}
        </button>
      </div>
    </div>
  );
}

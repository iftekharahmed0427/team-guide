"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import CustomSelect from "@/app/components/custom-select";
import { updatePresence } from "./actions";

type Presence = {
  presenceStatus: string;
  presenceActivityType: string;
  presenceActivityText: string;
};

export default function PresenceForm({ presence }: { presence: Presence }) {
  const router = useRouter();
  const [status, setStatus] = useState(presence.presenceStatus);
  const [activityType, setActivityType] = useState(presence.presenceActivityType);
  const [activityText, setActivityText] = useState(presence.presenceActivityText);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const noActivity = activityType === "none";

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updatePresence({
        presenceStatus: status,
        presenceActivityType: activityType,
        presenceActivityText: noActivity ? "" : activityText.trim(),
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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Status</label>
          <CustomSelect
            name="presenceStatus"
            defaultValue={status}
            onChange={setStatus}
            options={[
              { value: "online", label: "Online" },
              { value: "idle", label: "Idle" },
              { value: "dnd", label: "Do Not Disturb" },
              { value: "invisible", label: "Invisible" },
            ]}
          />
        </div>
        <div>
          <label className={label}>Activity</label>
          <CustomSelect
            name="presenceActivityType"
            defaultValue={activityType}
            onChange={setActivityType}
            options={[
              { value: "none", label: "None" },
              { value: "Playing", label: "Playing" },
              { value: "Watching", label: "Watching" },
              { value: "Listening", label: "Listening to" },
              { value: "Competing", label: "Competing in" },
              { value: "Custom", label: "Custom status" },
            ]}
          />
        </div>
      </div>

      <div>
        <label className={label}>Activity text</label>
        <input
          value={activityText}
          onChange={(e) => setActivityText(e.target.value)}
          disabled={noActivity}
          placeholder={noActivity ? "No activity" : "e.g. ticket reports"}
          className="h-9 w-full border border-border bg-surface-2 px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-muted disabled:opacity-50"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? (
          <span className="text-xs text-red-400">{error}</span>
        ) : (
          <span className="text-xs text-muted">
            Applied within ~30s of saving.
          </span>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-wipe btn-wipe-dark flex h-9 shrink-0 items-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background disabled:opacity-50"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            {pending ? (
              <Loader2 size={15} strokeWidth={2} className="animate-spin" />
            ) : saved ? (
              <Check size={15} strokeWidth={2} />
            ) : null}
          </span>
          {saved ? "Saved" : "Save presence"}
        </button>
      </div>
    </div>
  );
}
